"""事実関係類似判例検索 API ルーター。"""

import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.services.search_service import (
    SearchFilters,
    generate_case_timeline,
    get_filter_options,
    get_store_status,
    search_and_analyze,
    search_similar_cases,
)

router = APIRouter()


# ── リクエストモデル ──────────────────────────────────────


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=10, max_length=5000)
    filters: SearchFilters | None = None
    top_k: int = Field(default=10, ge=1, le=30)


class TimelineRequest(BaseModel):
    case_ids: list[str] = Field(..., min_length=1, max_length=30)
    query: str = ""


# ── エンドポイント ──────────────────────────────────────


@router.get("/filters")
def search_filters(db: Session = Depends(get_db)):
    """検索フィルタの選択肢を返す。"""
    return get_filter_options(db)


@router.get("/store-status")
async def store_status():
    """File Search Storeの状態を返す。"""
    return await get_store_status()


@router.post("/similar")
async def search_similar(body: SearchRequest, db: Session = Depends(get_db)):
    """事実関係に基づく類似判例検索。"""
    try:
        result = await search_similar_cases(db, body.query, body.filters, body.top_k)
        return result.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/analyze")
async def search_analyze(body: SearchRequest, db: Session = Depends(get_db)):
    """類似判例検索 + AI分析（SSEストリーミング）。"""

    async def event_stream():
        try:
            async for chunk in search_and_analyze(
                db, body.query, body.filters, body.top_k
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


@router.post("/timeline")
async def search_timeline(body: TimelineRequest, db: Session = Depends(get_db)):
    """選択された判例のタイムラインを生成する。"""
    try:
        events = await generate_case_timeline(db, body.case_ids, body.query)
        return [e.model_dump() for e in events]
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
