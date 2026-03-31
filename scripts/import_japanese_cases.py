"""Bulk import of Japanese court case data from japanese-law-analysis/data_set.

Usage:
    python -m scripts.import_japanese_cases
    python -m scripts.import_japanese_cases --data-path /path/to/repo
    python -m scripts.import_japanese_cases --phase 1   # cases only
    python -m scripts.import_japanese_cases --phase 2   # judges only
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

# Allow importing backend modules from project root
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.collector.parser import ParsedJudge, parse_judges
from backend.config import settings
from backend.database import SessionLocal, init_db
from backend.models import Case, CaseJudge, Judge
from backend.utils.era_date import era_to_date

SKIP_FILES = {"list.json", "listup_info.json"}
CASE_BATCH_SIZE = 1000
JUDGE_BATCH_SIZE = 500


# --------------------------------------------------------------------------- #
#  Helpers
# --------------------------------------------------------------------------- #


def _parse_date_field(date_obj: dict | None):
    """Convert era date dict to datetime.date, returning None on failure."""
    if not date_obj or not isinstance(date_obj, dict):
        return None
    era = date_obj.get("era")
    year = date_obj.get("year")
    if not era or not year:
        return None
    return era_to_date(era, year, date_obj.get("month"), date_obj.get("day"))


def _build_case(data: dict) -> Case | None:
    """Build a Case ORM object from raw JSON dict. Returns None if required fields missing."""
    lawsuit_id = data.get("lawsuit_id")
    case_number = data.get("case_number")
    if not lawsuit_id or not case_number:
        return None

    return Case(
        id=str(lawsuit_id),
        case_number=case_number,
        case_name=data.get("case_name"),
        court_name=data.get("court_name"),
        trial_type=data.get("trial_type"),
        decision_date=_parse_date_field(data.get("date")),
        result_type=data.get("result_type"),
        result=data.get("result"),
        gist=data.get("gist"),
        case_gist=data.get("case_gist"),
        ref_law=data.get("ref_law"),
        full_text=data.get("contents"),
        article_info=data.get("article_info"),
        detail_page_link=data.get("detail_page_link"),
        full_pdf_link=data.get("full_pdf_link"),
        original_court_name=data.get("original_court_name"),
        original_case_number=data.get("original_case_number"),
    )


# --------------------------------------------------------------------------- #
#  Phase 1: Import cases
# --------------------------------------------------------------------------- #


def phase1_import_cases(precedent_dir: Path) -> int:
    """Walk decade directories and bulk-insert Case records."""
    print("\n=== Phase 1: Import cases ===")
    db = SessionLocal()

    # Collect existing IDs to skip duplicates efficiently
    existing_ids: set[str] = {row[0] for row in db.query(Case.id).all()}
    print(f"Existing cases in DB: {len(existing_ids)}")

    decade_dirs = sorted(
        d for d in precedent_dir.iterdir() if d.is_dir() and d.name.isdigit()
    )

    total_imported = 0
    total_skipped = 0
    total_errors = 0

    for decade_dir in decade_dirs:
        json_files = sorted(
            f for f in decade_dir.iterdir()
            if f.suffix == ".json" and f.name not in SKIP_FILES
        )

        decade_imported = 0
        decade_skipped = 0
        decade_errors = 0
        batch: list[Case] = []

        for jf in json_files:
            try:
                data = json.loads(jf.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError) as e:
                decade_errors += 1
                continue

            case = _build_case(data)
            if case is None:
                decade_errors += 1
                continue

            if case.id in existing_ids:
                decade_skipped += 1
                continue

            existing_ids.add(case.id)
            batch.append(case)
            decade_imported += 1

            if len(batch) >= CASE_BATCH_SIZE:
                db.bulk_save_objects(batch)
                db.commit()
                batch.clear()

        # Flush remaining
        if batch:
            db.bulk_save_objects(batch)
            db.commit()
            batch.clear()

        total_imported += decade_imported
        total_skipped += decade_skipped
        total_errors += decade_errors

        file_count = len(json_files)
        print(
            f"[Phase 1] {decade_dir.name}: "
            f"{decade_imported}/{file_count} cases imported"
            f"{f', {decade_skipped} skipped' if decade_skipped else ''}"
            f"{f', {decade_errors} errors' if decade_errors else ''}"
        )

    db.close()
    print(
        f"\n[Phase 1] Done: {total_imported} imported, "
        f"{total_skipped} skipped (duplicate), {total_errors} errors"
    )
    return total_imported


# --------------------------------------------------------------------------- #
#  Phase 2: Parse judges
# --------------------------------------------------------------------------- #


def phase2_parse_judges() -> int:
    """Parse judge info from full_text for all cases that have it."""
    print("\n=== Phase 2: Parse judges ===")
    db = SessionLocal()

    total_cases = db.query(Case).count()
    cases_to_parse = (
        db.query(Case)
        .filter(Case.full_text.isnot(None), Case.has_judge_info == False)  # noqa: E712
        .all()
    )
    total_to_parse = len(cases_to_parse)
    print(f"Cases with full_text to parse: {total_to_parse}/{total_cases}")

    if total_to_parse == 0:
        print("[Phase 2] Nothing to parse.")
        db.close()
        return 0

    # Cache existing judges: (name, court_name) -> Judge
    judge_cache: dict[tuple[str, str | None], Judge] = {}
    for j in db.query(Judge).all():
        judge_cache[(j.name, j.court_name)] = j

    parsed_count = 0
    judges_created = 0
    links_created = 0

    for i, case in enumerate(cases_to_parse, 1):
        parsed = parse_judges(case.full_text, trial_type=case.trial_type)

        for pj in parsed:
            key = (pj.name, case.court_name)
            judge = judge_cache.get(key)

            if judge is None:
                judge = Judge(
                    name=pj.name,
                    court_name=case.court_name,
                    is_supreme_court=pj.is_supreme,
                    first_seen_date=case.decision_date,
                    last_seen_date=case.decision_date,
                )
                db.add(judge)
                db.flush()  # get judge.id
                judge_cache[key] = judge
                judges_created += 1
            else:
                # Update date range
                if case.decision_date:
                    if not judge.first_seen_date or case.decision_date < judge.first_seen_date:
                        judge.first_seen_date = case.decision_date
                    if not judge.last_seen_date or case.decision_date > judge.last_seen_date:
                        judge.last_seen_date = case.decision_date

            # Create CaseJudge link (skip if exists)
            existing_link = (
                db.query(CaseJudge)
                .filter(CaseJudge.case_id == case.id, CaseJudge.judge_id == judge.id)
                .first()
            )
            if not existing_link:
                db.add(CaseJudge(case_id=case.id, judge_id=judge.id, role=pj.role))
                links_created += 1

        if parsed:
            parsed_count += 1
        case.has_judge_info = True

        # Commit every JUDGE_BATCH_SIZE cases
        if i % JUDGE_BATCH_SIZE == 0:
            db.commit()
            unique_judges = len(judge_cache)
            print(
                f"[Phase 2] Parsed {i}/{total_to_parse} cases, "
                f"found {unique_judges} unique judges"
            )

    db.commit()
    db.close()

    unique_judges = len(judge_cache)
    print(
        f"\n[Phase 2] Done: {parsed_count}/{total_to_parse} cases had judge info, "
        f"{judges_created} new judges, {links_created} case-judge links, "
        f"{unique_judges} unique judges total"
    )
    return parsed_count


# --------------------------------------------------------------------------- #
#  Phase 3: Summary
# --------------------------------------------------------------------------- #


def phase3_summary():
    """Print final statistics."""
    print("\n=== Phase 3: Summary ===")
    db = SessionLocal()

    from sqlalchemy import func

    total_cases = db.query(Case).count()
    cases_with_judges = db.query(Case).filter(Case.has_judge_info == True).count()  # noqa: E712
    cases_with_text = db.query(Case).filter(Case.full_text.isnot(None)).count()
    unique_judges = db.query(Judge).count()
    total_links = db.query(CaseJudge).count()

    print(f"Total cases:           {total_cases:>8,}")
    print(f"Cases with full text:  {cases_with_text:>8,}")
    print(f"Cases with judge info: {cases_with_judges:>8,}")
    print(f"Unique judges:         {unique_judges:>8,}")
    print(f"Case-Judge links:      {total_links:>8,}")

    # By trial_type
    print("\nBy trial_type:")
    rows = (
        db.query(Case.trial_type, func.count(Case.id))
        .group_by(Case.trial_type)
        .order_by(func.count(Case.id).desc())
        .all()
    )
    for trial_type, cnt in rows:
        label = trial_type or "(none)"
        print(f"  {label:<25s} {cnt:>8,}")

    # Top 10 judges by case count
    if unique_judges > 0:
        print("\nTop 10 judges by case count:")
        top = (
            db.query(Judge.name, Judge.court_name, func.count(CaseJudge.case_id).label("cnt"))
            .join(CaseJudge)
            .group_by(Judge.id)
            .order_by(func.count(CaseJudge.case_id).desc())
            .limit(10)
            .all()
        )
        for name, court, cnt in top:
            print(f"  {name} ({court}): {cnt}件")

    db.close()


# --------------------------------------------------------------------------- #
#  Main
# --------------------------------------------------------------------------- #


def main():
    parser = argparse.ArgumentParser(
        description="Bulk import Japanese court cases from japanese-law-analysis/data_set"
    )
    parser.add_argument(
        "--data-path",
        type=Path,
        default=settings.data_source_path,
        help=f"Path to cloned data_set repo (default: {settings.data_source_path})",
    )
    parser.add_argument(
        "--phase",
        type=str,
        default="all",
        choices=["1", "2", "all"],
        help="Run specific phase: 1 (import cases), 2 (parse judges), or all",
    )
    args = parser.parse_args()

    precedent_dir = args.data_path / "precedent"
    if not precedent_dir.is_dir():
        print(f"ERROR: Precedent directory not found: {precedent_dir}")
        print(f"Clone the repo first: git clone <repo> {args.data_path}")
        sys.exit(1)

    # Initialize DB (create tables if needed)
    init_db()

    start = time.time()

    if args.phase in ("1", "all"):
        phase1_import_cases(precedent_dir)

    if args.phase in ("2", "all"):
        phase2_parse_judges()

    phase3_summary()

    elapsed = time.time() - start
    minutes, seconds = divmod(int(elapsed), 60)
    print(f"\nTotal time: {minutes}m {seconds}s")


if __name__ == "__main__":
    main()
