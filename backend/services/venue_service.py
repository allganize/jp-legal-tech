from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.models import Case, CaseJudge, Judge

# result 基準の有利/不利分類
FAVORABLE_OUTCOMES = {"認容", "一部認容", "破棄差戻", "破棄自判", "取消", "変更"}
UNFAVORABLE_OUTCOMES = {"棄却", "却下", "上告棄却", "上告不受理"}


def get_decision_type_mapping() -> dict:
    """有利/不利の判決類型マッピングを返す。"""
    return {
        "favorable": sorted(FAVORABLE_OUTCOMES),
        "unfavorable": sorted(UNFAVORABLE_OUTCOMES),
    }


def list_case_types(db: Session) -> list[dict]:
    """事件種類一覧 + 件数。"""
    rows = db.execute(
        select(Case.trial_type, func.count().label("count"))
        .where(Case.trial_type.isnot(None))
        .group_by(Case.trial_type)
        .order_by(func.count().desc())
    ).all()
    return [{"type": r.trial_type, "count": r.count} for r in rows]


def list_courts(db: Session, case_type: str | None = None) -> list[dict]:
    """裁判所一覧 + 件数 + 簡易認容率（事件種類フィルタ可能）。"""
    favorable_cases = [
        func.sum(func.iif(Case.result == o, 1, 0))
        for o in FAVORABLE_OUTCOMES
    ]
    unfavorable_cases = [
        func.sum(func.iif(Case.result == o, 1, 0))
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
        query = query.where(Case.trial_type == case_type)
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
    """result分布から認容率/棄却率/未分類率を計算する。

    認容率と棄却率は分類済み件数基準で計算する（未分類を除外）。
    未分類率は全体件数対比の比率で別途算出する。
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
    """裁判所別の核心統計を返す。"""

    def _base_filter(query):
        query = query.where(Case.court_name == court_name)
        if case_type:
            query = query.where(Case.trial_type == case_type)
        return query

    # Total cases
    total = db.execute(
        _base_filter(select(func.count()).select_from(Case))
    ).scalar() or 0

    # result 分布（認容率/棄却率の計算基盤）
    outcome_rows = db.execute(
        _base_filter(
            select(Case.result, func.count().label("count"))
        )
        .group_by(Case.result)
        .order_by(func.count().desc())
    ).all()
    outcome_dist = [{"type": r.result or "未分類", "count": r.count} for r in outcome_rows]

    # Decision type distribution (result_type — チャート用)
    decision_rows = db.execute(
        _base_filter(
            select(Case.result_type, func.count().label("count"))
        )
        .group_by(Case.result_type)
        .order_by(func.count().desc())
    ).all()

    # Case type distribution (trial_type)
    case_type_rows = db.execute(
        _base_filter(
            select(Case.trial_type, func.count().label("count"))
        )
        .group_by(Case.trial_type)
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
        judge_query = judge_query.where(Case.trial_type == case_type)
    judge_rows = db.execute(
        judge_query
        .group_by(Judge.id, Judge.name)
        .order_by(func.count(CaseJudge.case_id).desc())
        .limit(10)
    ).all()

    # Per-judge result distribution
    top_judges = []
    for jr in judge_rows:
        jd_query = (
            select(Case.result, func.count().label("count"))
            .join(CaseJudge, CaseJudge.case_id == Case.id)
            .where(CaseJudge.judge_id == jr.id, Case.court_name == court_name)
        )
        if case_type:
            jd_query = jd_query.where(Case.trial_type == case_type)
        jd_rows = db.execute(jd_query.group_by(Case.result)).all()
        judge_outcome_dist = [{"type": r.result or "未分類", "count": r.count} for r in jd_rows]
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
            {"type": r.result_type or "未分類", "count": r.count} for r in decision_rows
        ],
        "case_type_distribution": [
            {"type": r.trial_type or "未分類", "count": r.count} for r in case_type_rows
        ],
        "yearly_distribution": [{"year": r.year, "count": r.count} for r in yearly_rows],
        "top_judges": top_judges,
    }


def compare_courts(
    db: Session, court_names: list[str], case_type: str | None = None
) -> dict:
    """複数裁判所の統計を並列集計して返す。"""
    courts = [get_court_stats(db, name, case_type) for name in court_names]
    # 認容率基準で順位付与
    sorted_courts = sorted(courts, key=lambda c: c["acceptance_rate"], reverse=True)
    for rank, court in enumerate(sorted_courts, 1):
        court["rank"] = rank
    return {
        "courts": courts,
        "case_type": case_type,
    }
