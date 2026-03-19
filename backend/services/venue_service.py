from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.models import Case, CaseJudge, Judge

# parsed_outcome 기반 유/불리 분류
FAVORABLE_OUTCOMES = {"원고승", "일부인용", "파기환송", "파기자판"}
UNFAVORABLE_OUTCOMES = {"원고패", "상고기각", "각하", "상고각하"}


def get_decision_type_mapping() -> dict:
    """유리/불리 판결유형 매핑을 반환한다."""
    return {
        "favorable": sorted(FAVORABLE_OUTCOMES),
        "unfavorable": sorted(UNFAVORABLE_OUTCOMES),
    }


def list_case_types(db: Session) -> list[dict]:
    """사건유형 목록 + 건수."""
    rows = db.execute(
        select(Case.case_type_name, func.count().label("count"))
        .where(Case.case_type_name.isnot(None))
        .group_by(Case.case_type_name)
        .order_by(func.count().desc())
    ).all()
    return [{"type": r.case_type_name, "count": r.count} for r in rows]


def list_courts(db: Session, case_type: str | None = None) -> list[dict]:
    """법원 목록 + 건수 + 간략 인용률 (사건유형 필터 가능)."""
    favorable_cases = [
        func.sum(func.iif(Case.parsed_outcome == o, 1, 0))
        for o in FAVORABLE_OUTCOMES
    ]
    unfavorable_cases = [
        func.sum(func.iif(Case.parsed_outcome == o, 1, 0))
        for o in UNFAVORABLE_OUTCOMES
    ]
    favorable_sum = sum(favorable_cases)
    unfavorable_sum = sum(unfavorable_cases)

    query = (
        select(
            Case.court_name,
            func.count().label("count"),
            favorable_sum.label("favorable"),
            unfavorable_sum.label("unfavorable"),
        )
        .where(Case.court_name.isnot(None), Case.court_name != "")
    )
    if case_type:
        query = query.where(Case.case_type_name == case_type)
    rows = db.execute(
        query.group_by(Case.court_name).order_by(func.count().desc())
    ).all()

    result = []
    for r in rows:
        classified = (r.favorable or 0) + (r.unfavorable or 0)
        acceptance_rate = round((r.favorable or 0) / classified * 100, 1) if classified > 0 else None
        result.append({
            "court_name": r.court_name,
            "total_cases": r.count,
            "acceptance_rate": acceptance_rate,
            "classified_cases": classified,
        })
    return result


def _compute_rates(outcome_dist: list[dict]) -> tuple[float, float, float]:
    """parsed_outcome 분포에서 인용률/기각률/미분류율을 계산한다.

    인용률과 기각률은 분류된 건수 기준으로 계산한다 (미분류 제외).
    미분류율은 전체 건수 대비 비율로 별도 산출한다.
    """
    total = sum(d["count"] for d in outcome_dist)
    if total == 0:
        return 0.0, 0.0, 0.0
    favorable = sum(d["count"] for d in outcome_dist if d["type"] in FAVORABLE_OUTCOMES)
    unfavorable = sum(d["count"] for d in outcome_dist if d["type"] in UNFAVORABLE_OUTCOMES)
    classified = favorable + unfavorable
    unclassified = total - classified
    if classified == 0:
        return 0.0, 0.0, round(unclassified / total * 100, 1)
    return (
        round(favorable / classified * 100, 1),
        round(unfavorable / classified * 100, 1),
        round(unclassified / total * 100, 1),
    )


def get_court_stats(db: Session, court_name: str, case_type: str | None = None) -> dict:
    """법원별 핵심 통계를 반환한다."""

    def _base_filter(query):
        query = query.where(Case.court_name == court_name)
        if case_type:
            query = query.where(Case.case_type_name == case_type)
        return query

    # Total cases
    total = db.execute(
        _base_filter(select(func.count()).select_from(Case))
    ).scalar() or 0

    # parsed_outcome 분포 (인용률/기각률 계산 기반)
    outcome_rows = db.execute(
        _base_filter(
            select(Case.parsed_outcome, func.count().label("count"))
        )
        .group_by(Case.parsed_outcome)
        .order_by(func.count().desc())
    ).all()
    outcome_dist = [{"type": r.parsed_outcome or "미분류", "count": r.count} for r in outcome_rows]

    # Decision type distribution (원본 — 차트용)
    decision_rows = db.execute(
        _base_filter(
            select(Case.decision_type, func.count().label("count"))
        )
        .group_by(Case.decision_type)
        .order_by(func.count().desc())
    ).all()

    # Case type distribution
    case_type_rows = db.execute(
        _base_filter(
            select(Case.case_type_name, func.count().label("count"))
        )
        .group_by(Case.case_type_name)
        .order_by(func.count().desc())
    ).all()

    # Yearly distribution
    yearly_rows = db.execute(
        _base_filter(
            select(
                func.strftime("%Y", Case.decision_date).label("year"),
                func.count().label("count"),
            )
        )
        .where(Case.decision_date.isnot(None))
        .group_by("year")
        .order_by("year")
    ).all()

    # Date range
    date_range_row = db.execute(
        _base_filter(
            select(
                func.min(Case.decision_date).label("min_date"),
                func.max(Case.decision_date).label("max_date"),
            )
        )
    ).one()

    # Top judges at this court for this case type
    judge_query = (
        select(
            Judge.id,
            Judge.name,
            func.count(CaseJudge.case_id).label("case_count"),
        )
        .join(CaseJudge, CaseJudge.judge_id == Judge.id)
        .join(Case, Case.id == CaseJudge.case_id)
        .where(Case.court_name == court_name)
    )
    if case_type:
        judge_query = judge_query.where(Case.case_type_name == case_type)
    judge_rows = db.execute(
        judge_query
        .group_by(Judge.id, Judge.name)
        .order_by(func.count(CaseJudge.case_id).desc())
        .limit(10)
    ).all()

    # Per-judge parsed_outcome distribution
    top_judges = []
    for jr in judge_rows:
        jd_query = (
            select(Case.parsed_outcome, func.count().label("count"))
            .join(CaseJudge, CaseJudge.case_id == Case.id)
            .where(CaseJudge.judge_id == jr.id, Case.court_name == court_name)
        )
        if case_type:
            jd_query = jd_query.where(Case.case_type_name == case_type)
        jd_rows = db.execute(jd_query.group_by(Case.parsed_outcome)).all()
        judge_outcome_dist = [{"type": r.parsed_outcome or "미분류", "count": r.count} for r in jd_rows]
        j_acc, j_dis, _ = _compute_rates(judge_outcome_dist)
        top_judges.append({
            "judge_id": jr.id,
            "name": jr.name,
            "case_count": jr.case_count,
            "acceptance_rate": j_acc,
            "dismissal_rate": j_dis,
        })

    acceptance_rate, dismissal_rate, unclassified_rate = _compute_rates(outcome_dist)

    return {
        "court_name": court_name,
        "total_cases": total,
        "date_range": {
            "min": date_range_row.min_date.isoformat() if date_range_row.min_date else None,
            "max": date_range_row.max_date.isoformat() if date_range_row.max_date else None,
        },
        "acceptance_rate": acceptance_rate,
        "dismissal_rate": dismissal_rate,
        "unclassified_rate": unclassified_rate,
        "outcome_distribution": outcome_dist,
        "decision_type_distribution": [
            {"type": r.decision_type or "미분류", "count": r.count} for r in decision_rows
        ],
        "case_type_distribution": [
            {"type": r.case_type_name or "미분류", "count": r.count} for r in case_type_rows
        ],
        "yearly_distribution": [{"year": r.year, "count": r.count} for r in yearly_rows],
        "top_judges": top_judges,
    }


def compare_courts(
    db: Session, court_names: list[str], case_type: str | None = None
) -> dict:
    """복수 법원의 통계를 병렬 집계하여 반환한다."""
    courts = [get_court_stats(db, name, case_type) for name in court_names]
    # 인용률 기준 순위 부여
    sorted_courts = sorted(courts, key=lambda c: c["acceptance_rate"], reverse=True)
    for rank, court in enumerate(sorted_courts, 1):
        court["rank"] = rank
    return {
        "courts": courts,
        "case_type": case_type,
    }
