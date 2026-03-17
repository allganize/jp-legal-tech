from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.models import Case, CaseJudge, CollectionProgress, Judge


def get_collection_stats(db: Session) -> dict:
    """수집 현황 통계."""
    total_cases = db.execute(select(func.count()).select_from(Case)).scalar()
    detail_fetched = db.execute(
        select(func.count()).select_from(Case).where(Case.detail_fetched == True)  # noqa: E712
    ).scalar()
    with_judge_info = db.execute(
        select(func.count()).select_from(Case).where(Case.has_judge_info == True)  # noqa: E712
    ).scalar()
    total_judges = db.execute(select(func.count()).select_from(Judge)).scalar()
    total_links = db.execute(select(func.count()).select_from(CaseJudge)).scalar()

    progress_records = db.execute(select(CollectionProgress)).scalars().all()
    phases = {
        p.phase: {
            "status": p.status,
            "page": p.page,
            "total_pages": p.total_pages,
            "total_count": p.total_count,
            "last_fetched_at": p.last_fetched_at.isoformat() if p.last_fetched_at else None,
        }
        for p in progress_records
    }

    return {
        "total_cases": total_cases,
        "detail_fetched": detail_fetched,
        "with_judge_info": with_judge_info,
        "total_judges": total_judges,
        "total_case_judge_links": total_links,
        "phases": phases,
    }
