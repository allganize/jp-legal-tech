from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.models import Case, CaseJudge, Judge


def search_judges(db: Session, query: str, limit: int = 20) -> list[dict]:
    """판사 이름으로 검색."""
    judges = db.execute(
        select(
            Judge.id,
            Judge.name,
            Judge.court_name,
            Judge.is_supreme_court,
            Judge.first_seen_date,
            Judge.last_seen_date,
            func.count(CaseJudge.case_id).label("case_count"),
        )
        .join(CaseJudge, CaseJudge.judge_id == Judge.id, isouter=True)
        .where(Judge.name.contains(query))
        .group_by(Judge.id)
        .order_by(func.count(CaseJudge.case_id).desc())
        .limit(limit)
    ).all()

    return [
        {
            "id": j.id,
            "name": j.name,
            "court_name": j.court_name,
            "is_supreme_court": j.is_supreme_court,
            "first_seen_date": j.first_seen_date.isoformat() if j.first_seen_date else None,
            "last_seen_date": j.last_seen_date.isoformat() if j.last_seen_date else None,
            "case_count": j.case_count,
        }
        for j in judges
    ]


def get_judge_profile(db: Session, judge_id: int) -> dict | None:
    """판사 프로필 + 통계."""
    judge = db.get(Judge, judge_id)
    if not judge:
        return None

    # Case count
    case_count = db.execute(
        select(func.count()).select_from(CaseJudge).where(CaseJudge.judge_id == judge_id)
    ).scalar()

    # Case type distribution
    case_type_dist = db.execute(
        select(Case.case_type_name, func.count().label("count"))
        .join(CaseJudge, CaseJudge.case_id == Case.id)
        .where(CaseJudge.judge_id == judge_id)
        .group_by(Case.case_type_name)
        .order_by(func.count().desc())
    ).all()

    # Decision type distribution
    decision_type_dist = db.execute(
        select(Case.decision_type, func.count().label("count"))
        .join(CaseJudge, CaseJudge.case_id == Case.id)
        .where(CaseJudge.judge_id == judge_id)
        .group_by(Case.decision_type)
        .order_by(func.count().desc())
    ).all()

    # Yearly distribution
    yearly_dist = db.execute(
        select(
            func.strftime("%Y", Case.decision_date).label("year"),
            func.count().label("count"),
        )
        .join(CaseJudge, CaseJudge.case_id == Case.id)
        .where(CaseJudge.judge_id == judge_id, Case.decision_date.isnot(None))
        .group_by("year")
        .order_by("year")
    ).all()

    # Role distribution
    role_dist = db.execute(
        select(CaseJudge.role, func.count().label("count"))
        .where(CaseJudge.judge_id == judge_id)
        .group_by(CaseJudge.role)
        .order_by(func.count().desc())
    ).all()

    # Courts served
    courts = db.execute(
        select(Case.court_name, func.count().label("count"))
        .join(CaseJudge, CaseJudge.case_id == Case.id)
        .where(CaseJudge.judge_id == judge_id)
        .group_by(Case.court_name)
        .order_by(func.count().desc())
    ).all()

    return {
        "id": judge.id,
        "name": judge.name,
        "court_name": judge.court_name,
        "is_supreme_court": judge.is_supreme_court,
        "first_seen_date": judge.first_seen_date.isoformat() if judge.first_seen_date else None,
        "last_seen_date": judge.last_seen_date.isoformat() if judge.last_seen_date else None,
        "case_count": case_count,
        "case_type_distribution": [{"type": r.case_type_name or "미분류", "count": r.count} for r in case_type_dist],
        "decision_type_distribution": [{"type": r.decision_type or "미분류", "count": r.count} for r in decision_type_dist],
        "yearly_distribution": [{"year": r.year, "count": r.count} for r in yearly_dist],
        "role_distribution": [{"role": r.role or "미분류", "count": r.count} for r in role_dist],
        "courts_served": [{"court": r.court_name or "미분류", "count": r.count} for r in courts],
    }


def get_judge_cases(
    db: Session,
    judge_id: int,
    page: int = 1,
    page_size: int = 20,
    case_type: str | None = None,
    year: int | None = None,
    sort: str = "date_desc",
) -> dict:
    """판사의 판결 목록."""
    query = (
        select(Case, CaseJudge.role)
        .join(CaseJudge, CaseJudge.case_id == Case.id)
        .where(CaseJudge.judge_id == judge_id)
    )

    if case_type:
        query = query.where(Case.case_type_name == case_type)
    if year:
        query = query.where(func.strftime("%Y", Case.decision_date) == str(year))

    # Count total
    count_query = (
        select(func.count())
        .select_from(CaseJudge)
        .join(Case, Case.id == CaseJudge.case_id)
        .where(CaseJudge.judge_id == judge_id)
    )
    if case_type:
        count_query = count_query.where(Case.case_type_name == case_type)
    if year:
        count_query = count_query.where(func.strftime("%Y", Case.decision_date) == str(year))
    total = db.execute(count_query).scalar()

    # Sort
    if sort == "date_asc":
        query = query.order_by(Case.decision_date.asc())
    else:
        query = query.order_by(Case.decision_date.desc())

    # Paginate
    offset = (page - 1) * page_size
    results = db.execute(query.offset(offset).limit(page_size)).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if total else 0,
        "cases": [
            {
                "id": case.id,
                "case_number": case.case_number,
                "case_name": case.case_name,
                "court_name": case.court_name,
                "case_type_name": case.case_type_name,
                "decision_date": case.decision_date.isoformat() if case.decision_date else None,
                "decision_type": case.decision_type,
                "role": role,
            }
            for case, role in results
        ],
    }
