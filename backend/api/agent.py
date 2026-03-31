import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.services.llm_service import review_document_as_judge, revise_document_as_judge

router = APIRouter()


class DocumentReviewRequest(BaseModel):
    document: str = Field(..., max_length=50000, description="レビュー対象の法律文書テキスト")


class DocumentReviseRequest(BaseModel):
    document: str = Field(..., max_length=50000, description="原本の法律文書テキスト")
    feedback: str = Field(..., max_length=50000, description="AIレビューフィードバック")


@router.post("/{judge_id}/review")
async def review_document(
    judge_id: int,
    body: DocumentReviewRequest,
    db: Session = Depends(get_db),
):
    """裁判官の視点で文書をレビューする（SSEストリーミング）。"""
    try:
        async def event_stream():
            try:
                async for chunk in review_document_as_judge(db, judge_id, body.document):
                    # JSON エンコーディングで改行文字を安全に送信
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


@router.post("/{judge_id}/revise")
async def revise_document(
    judge_id: int,
    body: DocumentReviseRequest,
    db: Session = Depends(get_db),
):
    """レビューフィードバックを反映して改善された文書を生成する（SSEストリーミング）。"""
    try:
        async def event_stream():
            try:
                async for chunk in revise_document_as_judge(
                    db, judge_id, body.document, body.feedback
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
