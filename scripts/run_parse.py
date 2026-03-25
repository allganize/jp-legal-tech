"""파싱 안된 판례들을 바로 파싱하는 스크립트 (판사 파싱 + 결과 파싱)."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
from sqlalchemy import select, func
from backend.database import SessionLocal
from backend.models import Case, CaseJudge, Judge
from backend.collector.parser import parse_judges
from backend.services.outcome_parser import parse_outcome

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(message)s')
logger = logging.getLogger(__name__)


def run_judge_parse(batch_size=200):
    """본문이 있지만 판사 파싱 안 된 케이스들 파싱."""
    db = SessionLocal()
    total_parsed = 0
    try:
        while True:
            cases = db.execute(
                select(Case).where(
                    Case.detail_fetched == True,
                    Case.has_judge_info == False,
                    Case.full_text.isnot(None),
                    Case.full_text != "",
                ).limit(batch_size)
            ).scalars().all()

            if not cases:
                break

            for case in cases:
                judges = parse_judges(case.full_text)
                if judges:
                    for pj in judges:
                        judge = _get_or_create_judge(db, pj.name, pj.is_supreme, case.court_name, case.decision_date)
                        existing = db.execute(
                            select(CaseJudge).where(CaseJudge.case_id == case.id, CaseJudge.judge_id == judge.id)
                        ).scalar_one_or_none()
                        if not existing:
                            db.add(CaseJudge(case_id=case.id, judge_id=judge.id, role=pj.role))
                    total_parsed += 1
                case.has_judge_info = True

            db.commit()
            logger.info(f"[judge_parse] {total_parsed}건 파싱 완료")

        logger.info(f"[judge_parse] 최종 완료: {total_parsed}건")
    finally:
        db.close()


def run_outcome_parse(batch_size=500):
    """결과(인용/기각) 파싱 안 된 케이스들 파싱."""
    db = SessionLocal()
    total_parsed = 0
    try:
        while True:
            cases = db.execute(
                select(Case).where(
                    Case.full_text.isnot(None),
                    Case.full_text != "",
                    Case.parsed_outcome.is_(None),
                ).limit(batch_size)
            ).scalars().all()

            if not cases:
                break

            for case in cases:
                result = parse_outcome(case)
                case.parsed_outcome = result or "unknown"
                total_parsed += 1

            db.commit()
            logger.info(f"[outcome_parse] {total_parsed}건 파싱 완료")

        logger.info(f"[outcome_parse] 최종 완료: {total_parsed}건")
    finally:
        db.close()


def _get_or_create_judge(db, name, is_supreme, court_name, decision_date):
    judge = db.execute(
        select(Judge).where(Judge.name == name, Judge.court_name == court_name)
    ).scalar_one_or_none()
    if judge:
        if decision_date:
            if not judge.first_seen_date or decision_date < judge.first_seen_date:
                judge.first_seen_date = decision_date
            if not judge.last_seen_date or decision_date > judge.last_seen_date:
                judge.last_seen_date = decision_date
        return judge
    judge = Judge(name=name, court_name=court_name, is_supreme_court=is_supreme,
                  first_seen_date=decision_date, last_seen_date=decision_date)
    db.add(judge)
    db.flush()
    return judge


if __name__ == "__main__":
    logger.info("=== 판사 파싱 시작 ===")
    run_judge_parse()
    logger.info("=== 결과 파싱 시작 ===")
    run_outcome_parse()
    logger.info("=== 모든 파싱 완료 ===")
