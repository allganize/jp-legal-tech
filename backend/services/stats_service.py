from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.models import Case, CaseJudge, Judge


def get_collection_stats(db: Session) -> dict:
    """データ統計の概要。"""
    total_cases = db.execute(select(func.count()).select_from(Case)).scalar()
    with_judge_info = db.execute(
        select(func.count()).select_from(Case).where(Case.has_judge_info == True)  # noqa: E712
    ).scalar()
    total_judges = db.execute(select(func.count()).select_from(Judge)).scalar()
    total_links = db.execute(select(func.count()).select_from(CaseJudge)).scalar()

    return {
        "total_cases": total_cases,
        "with_judge_info": with_judge_info,
        "total_judges": total_judges,
        "total_case_judge_links": total_links,
    }
