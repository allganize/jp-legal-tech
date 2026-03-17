"""규제 에이전트 API 라우터."""

import json

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.services.regulation_llm_service import generate_regulation_document
from backend.services.regulation_seed import seed_regulation_data
from backend.services.regulation_service import (
    get_clients,
    get_regulation_detail,
    get_regulation_feed,
    get_regulation_impacts,
    get_weekly_briefing,
)

router = APIRouter()


class GenerateDocRequest(BaseModel):
    regulation_id: int
    client_id: int | None = None
    doc_type: str  # research_memo, advisory_letter, newsletter
    force: bool = False


@router.get("/feed")
def list_regulations(
    category: str | None = None,
    reg_type: str | None = None,
    impact_level: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return get_regulation_feed(db, category, reg_type, impact_level, page, page_size)


@router.get("/feed/{regulation_id}")
def regulation_detail(regulation_id: int, db: Session = Depends(get_db)):
    result = get_regulation_detail(db, regulation_id)
    if not result:
        raise HTTPException(status_code=404, detail="규제 항목을 찾을 수 없습니다.")
    return result


@router.get("/feed/{regulation_id}/impacts")
def regulation_impacts(regulation_id: int, db: Session = Depends(get_db)):
    return get_regulation_impacts(db, regulation_id)


@router.get("/clients")
def list_clients(db: Session = Depends(get_db)):
    return get_clients(db)


@router.post("/generate")
async def generate_document(body: GenerateDocRequest, db: Session = Depends(get_db)):
    """규제 관련 문서를 생성한다 (SSE 스트리밍)."""
    try:
        async def event_stream():
            try:
                async for chunk in generate_regulation_document(
                    db, body.regulation_id, body.client_id, body.doc_type, body.force
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
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/weekly-briefing")
def weekly_briefing(db: Session = Depends(get_db)):
    return get_weekly_briefing(db)


@router.post("/seed")
def seed_data(db: Session = Depends(get_db)):
    result = seed_regulation_data(db)
    if result:
        return {"message": "Mock 데이터 시딩 완료"}
    return {"message": "이미 데이터가 존재합니다"}
