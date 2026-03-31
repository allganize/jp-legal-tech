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
    """事件種類一覧を返す。"""
    return list_case_types(db)


@router.get("/courts")
def venue_courts(
    case_type: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """裁判所一覧を返す。"""
    return list_courts(db, case_type)


@router.get("/court-stats")
def venue_court_stats(
    court: str = Query(...),
    case_type: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """裁判所別統計を返す。"""
    return get_court_stats(db, court, case_type)


@router.get("/decision-type-mapping")
def venue_decision_mapping():
    """有利/不利の判決類型マッピングを返す。"""
    return get_decision_type_mapping()


class CompareRequest(BaseModel):
    court_names: list[str] = Field(..., min_length=2, max_length=5)
    case_type: str | None = None


@router.post("/compare")
def venue_compare(body: CompareRequest, db: Session = Depends(get_db)):
    """複数裁判所を比較する。"""
    return compare_courts(db, body.court_names, body.case_type)


class RecommendRequest(BaseModel):
    case_type: str
    court_names: list[str] | None = None
    case_description: str | None = Field(None, max_length=10000)


@router.post("/recommend")
async def venue_recommend(body: RecommendRequest, db: Session = Depends(get_db)):
    """AIが最適な管轄裁判所を推薦する（SSEストリーミング）。"""

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
