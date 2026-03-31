from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.services.judge_service import get_judge_cases, get_judge_profile, search_judges
from backend.services.llm_service import generate_judge_persona

router = APIRouter()


@router.get("")
def list_judges(
    q: str = Query(..., min_length=1, description="裁判官名で検索"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return search_judges(db, q, limit)


@router.get("/{judge_id}/profile")
def judge_profile(judge_id: int, db: Session = Depends(get_db)):
    profile = get_judge_profile(db, judge_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Judge not found")
    return profile


@router.get("/{judge_id}/persona")
async def judge_persona(
    judge_id: int,
    regenerate: bool = False,
    db: Session = Depends(get_db),
):
    try:
        return await generate_judge_persona(db, judge_id, force=regenerate)
    except ValueError as e:
        msg = str(e)
        status = 503 if "API_KEY" in msg else 400
        raise HTTPException(status_code=status, detail=msg)


@router.get("/{judge_id}/cases")
def judge_cases(
    judge_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    case_type: str | None = None,
    year: int | None = None,
    sort: str = Query("date_desc", regex="^(date_asc|date_desc)$"),
    db: Session = Depends(get_db),
):
    return get_judge_cases(db, judge_id, page, page_size, case_type, year, sort)
