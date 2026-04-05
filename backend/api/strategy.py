"""Strategy simulation API endpoints."""

import json
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import (
    StrategyBrief,
    StrategyBriefSection,
    StrategyIssue,
    StrategyItem,
    StrategyReviewItem,
    StrategySession,
)
from backend.services import strategy_service

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class SessionCreateRequest(BaseModel):
    case_type: str
    party_position: str
    overview: str
    judge_id: Optional[int] = None


class SessionResponse(BaseModel):
    id: str
    case_type: str
    party_position: str
    overview: str
    judge_id: Optional[int] = None
    current_step: int
    created_at: str

    model_config = {"from_attributes": True}


class SessionUpdateRequest(BaseModel):
    current_step: int


class IssueResponse(BaseModel):
    id: int
    rank: int
    name: str
    category: str
    score: int
    frequency: int
    win_rate: float
    lose_rate: float
    other_rate: float
    selected: bool

    model_config = {"from_attributes": True}


class StrategyItemResponse(BaseModel):
    id: int
    side: str
    title: str
    description: str
    strength_pct: int
    score_pct: int
    precedent_count: int
    rank: int

    model_config = {"from_attributes": True}


class BriefCreateResponse(BaseModel):
    brief_id: int
    status: str


class ReviewItemResponse(BaseModel):
    id: int
    side: str
    title: str
    description: str
    strength: Optional[str] = None
    effectiveness: Optional[str] = None
    precedent_ref: Optional[str] = None
    citation_rate: Optional[str] = None
    pair_index: Optional[int] = None

    model_config = {"from_attributes": True}


class ReviewResponse(BaseModel):
    counterarguments: list[ReviewItemResponse]
    responses: list[ReviewItemResponse]
    readiness_score: int
    critical_weakness: Optional[str] = None


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _get_session_or_404(db: Session, session_id: str) -> StrategySession:
    session = db.get(StrategySession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="セッションが見つかりません")
    return session


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/", response_model=SessionResponse)
def create_session(body: SessionCreateRequest, db: Session = Depends(get_db)):
    """Create a new strategy simulation session."""
    session = StrategySession(
        id=str(uuid.uuid4()),
        case_type=body.case_type,
        party_position=body.party_position,
        overview=body.overview,
        judge_id=body.judge_id,
        current_step=1,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return SessionResponse(
        id=session.id,
        case_type=session.case_type,
        party_position=session.party_position,
        overview=session.overview,
        judge_id=session.judge_id,
        current_step=session.current_step,
        created_at=session.created_at.isoformat(),
    )


@router.get("/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db)):
    """Get a session with all related data."""
    session = _get_session_or_404(db, session_id)

    issues = [IssueResponse.model_validate(i) for i in session.issues]
    items = [StrategyItemResponse.model_validate(i) for i in session.items]
    review_items = [ReviewItemResponse.model_validate(r) for r in session.review_items]

    briefs = []
    for b in session.briefs:
        sections = [
            {
                "id": s.id,
                "section_order": s.section_order,
                "title": s.title,
                "content": s.content,
                "status": s.status,
            }
            for s in sorted(b.sections, key=lambda s: s.section_order)
        ]
        briefs.append({
            "id": b.id,
            "status": b.status,
            "document_type": b.document_type,
            "full_content": b.full_content,
            "court_name": b.court_name,
            "party_side": b.party_side,
            "created_at": b.created_at.isoformat(),
            "sections": sections,
        })

    return {
        "id": session.id,
        "case_type": session.case_type,
        "party_position": session.party_position,
        "overview": session.overview,
        "judge_id": session.judge_id,
        "current_step": session.current_step,
        "created_at": session.created_at.isoformat(),
        "step1_data": json.loads(session.step1_data) if session.step1_data else None,
        "step2_data": json.loads(session.step2_data) if session.step2_data else None,
        "step3_data": json.loads(session.step3_data) if session.step3_data else None,
        "step4_data": json.loads(session.step4_data) if session.step4_data else None,
        "step5_data": json.loads(session.step5_data) if session.step5_data else None,
        "issues": [i.model_dump() for i in issues],
        "items": [i.model_dump() for i in items],
        "briefs": briefs,
        "review_items": [r.model_dump() for r in review_items],
    }


@router.patch("/{session_id}", response_model=SessionResponse)
def update_session(session_id: str, body: SessionUpdateRequest, db: Session = Depends(get_db)):
    """Update the current step of a session."""
    session = _get_session_or_404(db, session_id)
    session.current_step = body.current_step
    db.commit()
    db.refresh(session)
    return SessionResponse(
        id=session.id,
        case_type=session.case_type,
        party_position=session.party_position,
        overview=session.overview,
        judge_id=session.judge_id,
        current_step=session.current_step,
        created_at=session.created_at.isoformat(),
    )


@router.post("/{session_id}/issues")
async def generate_issues(session_id: str, db: Session = Depends(get_db)):
    """Call AI to extract legal issues and save them."""
    session = _get_session_or_404(db, session_id)

    # Clear existing issues for this session
    db.query(StrategyIssue).filter(StrategyIssue.session_id == session_id).delete()
    db.commit()

    result = await strategy_service.extract_issues(
        db=db,
        overview=session.overview,
        case_type=session.case_type,
        party_position=session.party_position,
        judge_id=session.judge_id,
    )

    # Save issues to DB
    issues = []
    for issue_data in result.get("issues", []):
        issue = StrategyIssue(
            session_id=session_id,
            rank=issue_data.get("rank", 0),
            name=issue_data.get("name", ""),
            category=issue_data.get("category", ""),
            score=issue_data.get("score", 0),
            frequency=issue_data.get("frequency", 0),
            win_rate=issue_data.get("win_rate", 0.0),
            lose_rate=issue_data.get("lose_rate", 0.0),
            other_rate=issue_data.get("other_rate", 0.0),
            selected=True,
        )
        db.add(issue)
        issues.append(issue)

    # Save step1 data
    session.step1_data = json.dumps(result, ensure_ascii=False)
    session.current_step = max(session.current_step, 2)
    db.commit()

    for issue in issues:
        db.refresh(issue)

    return {
        "issues": [IssueResponse.model_validate(i) for i in issues],
        "total_precedents": sum(i.frequency for i in issues),
    }


class StrategyGenerateRequest(BaseModel):
    selected_issue_ids: list[int] = []

@router.post("/{session_id}/strategies")
async def generate_strategies(session_id: str, body: StrategyGenerateRequest | None = None, db: Session = Depends(get_db)):
    """Call AI to generate attack/defense strategies and save them."""
    session = _get_session_or_404(db, session_id)

    # Apply selected_issue_ids if provided
    if body and body.selected_issue_ids:
        for issue in session.issues:
            issue.selected = issue.id in body.selected_issue_ids
        db.commit()

    # Get selected issues
    selected_issues = [
        {"name": i.name, "category": i.category, "score": i.score}
        for i in session.issues
        if i.selected
    ]
    if not selected_issues:
        raise HTTPException(status_code=400, detail="選択された争点がありません")

    # Clear existing items
    db.query(StrategyItem).filter(StrategyItem.session_id == session_id).delete()
    db.commit()

    result = await strategy_service.generate_strategies(
        db=db,
        overview=session.overview,
        selected_issues=selected_issues,
        party_position=session.party_position,
        judge_id=session.judge_id,
    )

    # Save strategies to DB
    items = []
    for rank, attack in enumerate(result.get("attacks", []), 1):
        item = StrategyItem(
            session_id=session_id,
            side="attack",
            title=attack.get("title", ""),
            description=attack.get("description", ""),
            strength_pct=attack.get("strength_pct", 0),
            score_pct=attack.get("score_pct", 0),
            precedent_count=attack.get("precedent_count", 0),
            rank=rank,
        )
        db.add(item)
        items.append(item)

    for rank, defense in enumerate(result.get("defenses", []), 1):
        item = StrategyItem(
            session_id=session_id,
            side="defense",
            title=defense.get("title", ""),
            description=defense.get("description", ""),
            strength_pct=defense.get("strength_pct", 0),
            score_pct=defense.get("score_pct", 0),
            precedent_count=defense.get("precedent_count", 0),
            rank=rank,
        )
        db.add(item)
        items.append(item)

    # Save step2 data
    session.step2_data = json.dumps(result, ensure_ascii=False)
    session.current_step = max(session.current_step, 3)
    db.commit()

    for item in items:
        db.refresh(item)

    attacks = [StrategyItemResponse.model_validate(i) for i in items if i.side == "attack"]
    defenses = [StrategyItemResponse.model_validate(i) for i in items if i.side == "defense"]
    return {"attacks": attacks, "defenses": defenses}


@router.post("/{session_id}/brief", response_model=BriefCreateResponse)
def create_brief(session_id: str, db: Session = Depends(get_db)):
    """Create a new brief record (pending status) for streaming generation."""
    session = _get_session_or_404(db, session_id)

    brief = StrategyBrief(
        session_id=session_id,
        status="pending",
        document_type="準備書面",
        party_side=session.party_position,
    )
    db.add(brief)
    db.commit()
    db.refresh(brief)

    return BriefCreateResponse(brief_id=brief.id, status=brief.status)


@router.get("/{session_id}/brief/{brief_id}/stream")
async def stream_brief(session_id: str, brief_id: int, db: Session = Depends(get_db)):
    """SSE stream for brief generation."""
    session = _get_session_or_404(db, session_id)
    brief = db.get(StrategyBrief, brief_id)
    if not brief or brief.session_id != session_id:
        raise HTTPException(status_code=404, detail="書面が見つかりません")

    # Build context from session data
    issues = [
        {"name": i.name, "category": i.category, "score": i.score}
        for i in session.issues
        if i.selected
    ]
    strategies = [
        {"title": s.title, "description": s.description, "side": s.side}
        for s in session.items
    ]

    brief.status = "generating"
    db.commit()

    async def event_stream():
        sections = {}
        full_content = ""
        try:
            async for chunk in strategy_service.generate_brief_stream(
                overview=session.overview,
                issues=issues,
                strategies=strategies,
                party_position=session.party_position,
            ):
                if chunk["type"] == "section_start":
                    sections[chunk.get("section_index", 0)] = {
                        "title": chunk.get("section_title", ""),
                        "content": "",
                    }
                elif chunk["type"] == "text":
                    full_content += chunk.get("content", "")
                    if sections:
                        last_idx = max(sections.keys())
                        sections[last_idx]["content"] += chunk.get("content", "")
                elif chunk["type"] == "done":
                    # Save to DB
                    brief.status = "completed"
                    brief.full_content = full_content
                    for idx, sec in sorted(sections.items()):
                        db.add(StrategyBriefSection(
                            brief_id=brief_id,
                            section_order=idx,
                            title=sec["title"],
                            content=sec["content"],
                            status="completed",
                        ))
                    session.step3_data = json.dumps(
                        {"brief_id": brief_id, "section_count": len(sections)},
                        ensure_ascii=False,
                    )
                    session.current_step = max(session.current_step, 4)
                    db.commit()

                yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"

            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.exception("Brief streaming error")
            brief.status = "error"
            db.commit()
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


@router.post("/{session_id}/review", response_model=ReviewResponse)
async def generate_review(session_id: str, db: Session = Depends(get_db)):
    """Call AI to generate red-team review and save items."""
    session = _get_session_or_404(db, session_id)

    # Get the latest completed brief
    brief = (
        db.query(StrategyBrief)
        .filter(
            StrategyBrief.session_id == session_id,
            StrategyBrief.status == "completed",
        )
        .order_by(StrategyBrief.created_at.desc())
        .first()
    )
    if not brief or not brief.full_content:
        raise HTTPException(status_code=400, detail="完了した書面がありません")

    strategies = [
        {"title": s.title, "description": s.description, "side": s.side}
        for s in session.items
    ]

    # Clear existing review items
    db.query(StrategyReviewItem).filter(StrategyReviewItem.session_id == session_id).delete()
    db.commit()

    result = await strategy_service.generate_review(
        overview=session.overview,
        brief_content=brief.full_content,
        strategies=strategies,
    )

    # Save review items to DB
    review_items = []
    for idx, ca in enumerate(result.get("counterarguments", [])):
        item = StrategyReviewItem(
            session_id=session_id,
            side="counterargument",
            title=ca.get("title", ""),
            description=ca.get("description", ""),
            strength=ca.get("strength"),
            precedent_ref=ca.get("precedent_ref"),
            citation_rate=ca.get("citation_rate"),
            pair_index=idx,
        )
        db.add(item)
        review_items.append(item)

    for idx, resp in enumerate(result.get("responses", [])):
        item = StrategyReviewItem(
            session_id=session_id,
            side="response",
            title=resp.get("title", ""),
            description=resp.get("description", ""),
            effectiveness=resp.get("effectiveness"),
            precedent_ref=resp.get("precedent_ref"),
            pair_index=idx,
        )
        db.add(item)
        review_items.append(item)

    # Save step5 data
    session.step5_data = json.dumps({
        "readiness_score": result.get("readiness_score", 50),
        "critical_weakness": result.get("critical_weakness"),
    }, ensure_ascii=False)
    session.current_step = max(session.current_step, 5)
    db.commit()

    for item in review_items:
        db.refresh(item)

    counterarguments = [ReviewItemResponse.model_validate(i) for i in review_items if i.side == "counterargument"]
    responses = [ReviewItemResponse.model_validate(i) for i in review_items if i.side == "response"]
    return ReviewResponse(
        counterarguments=counterarguments,
        responses=responses,
        readiness_score=result.get("readiness_score", 50),
        critical_weakness=result.get("critical_weakness"),
    )
