import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.services.llm_service import review_document_as_judge, revise_document_as_judge

router = APIRouter()


class DocumentReviewRequest(BaseModel):
    document: str = Field(..., max_length=50000, description="검토할 법률 문서 텍스트")


class DocumentReviseRequest(BaseModel):
    document: str = Field(..., max_length=50000, description="원본 법률 문서 텍스트")
    feedback: str = Field(..., max_length=50000, description="AI 검토 피드백")


@router.post("/{judge_id}/review")
async def review_document(
    judge_id: int,
    body: DocumentReviewRequest,
    db: Session = Depends(get_db),
):
    """판사 관점에서 문서를 리뷰한다 (SSE 스트리밍)."""
    try:
        async def event_stream():
            try:
                async for chunk in review_document_as_judge(db, judge_id, body.document):
                    # JSON 인코딩으로 줄바꿈 문자를 안전하게 전송
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
    """검토 피드백을 반영하여 보완된 문서를 생성한다 (SSE 스트리밍)."""
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
