import json

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.services.venue_service import (
    compare_courts,
    get_court_stats,
    get_decision_type_mapping,
    list_case_types,
    list_courts,
)
from backend.services.venue_llm_service import recommend_venue

router = APIRouter()


@router.get("/case-types")
def venue_case_types(db: Session = Depends(get_db)):
    """사건유형 목록을 반환한다."""
    return list_case_types(db)


@router.get("/courts")
def venue_courts(
    case_type: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """법원 목록을 반환한다."""
    return list_courts(db, case_type)


@router.get("/court-stats")
def venue_court_stats(
    court: str = Query(...),
    case_type: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """법원별 통계를 반환한다."""
    return get_court_stats(db, court, case_type)


@router.get("/decision-type-mapping")
def venue_decision_mapping():
    """유리/불리 판결유형 매핑을 반환한다."""
    return get_decision_type_mapping()


class CompareRequest(BaseModel):
    court_names: list[str] = Field(..., min_length=2, max_length=5)
    case_type: str | None = None


@router.post("/compare")
def venue_compare(body: CompareRequest, db: Session = Depends(get_db)):
    """복수 법원을 비교한다."""
    return compare_courts(db, body.court_names, body.case_type)


class RecommendRequest(BaseModel):
    case_type: str
    court_names: list[str] | None = None
    case_description: str | None = Field(None, max_length=10000)


@router.post("/recommend")
async def venue_recommend(body: RecommendRequest, db: Session = Depends(get_db)):
    """AI가 최적 관할 법원을 추천한다 (SSE 스트리밍)."""

    async def event_stream():
        try:
            async for chunk in recommend_venue(
                db, body.case_type, body.court_names, body.case_description
            ):
                yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
