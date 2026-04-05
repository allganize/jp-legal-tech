from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Case

router = APIRouter()


@router.get("/{case_id}")
def get_case(case_id: str, db: Session = Depends(get_db)):
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    judges = [
        {"judge_id": cj.judge_id, "name": cj.judge.name, "role": cj.role}
        for cj in case.judges
    ]

    return {
        "id": case.id,
        "case_number": case.case_number,
        "case_name": case.case_name,
        "court_name": case.court_name,
        "trial_type": case.trial_type,
        "decision_date": case.decision_date.isoformat() if case.decision_date else None,
        "result_type": case.result_type,
        "result": case.result,
        "gist": case.gist,
        "case_gist": case.case_gist,
        "ref_law": case.ref_law,
        "reference_cases": case.reference_cases,
        "full_text": case.full_text,
        "article_info": case.article_info,
        "detail_page_link": case.detail_page_link,
        "full_pdf_link": case.full_pdf_link,
        "original_court_name": case.original_court_name,
        "original_case_number": case.original_case_number,
        "judges": judges,
    }


@router.get("/{case_id}/related")
def get_related_cases(
    case_id: str,
    limit: int = Query(default=5, ge=1, le=20),
    db: Session = Depends(get_db),
):
    """同じ裁判所・事件種類の関連判例を返す。"""
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    query = (
        select(
            Case.id,
            Case.case_number,
            Case.case_name,
            Case.court_name,
            Case.decision_date,
            Case.result,
            Case.trial_type,
        )
        .where(Case.id != case_id)
        .order_by(Case.decision_date.desc())
        .limit(limit)
    )

    # 同じ裁判所 + 同じ事件種類で絞り込み (片方でもあれば)
    conditions = []
    if case.court_name:
        conditions.append(Case.court_name == case.court_name)
    if case.trial_type:
        conditions.append(Case.trial_type == case.trial_type)
    if conditions:
        from sqlalchemy import or_
        query = query.where(or_(*conditions))

    results = db.execute(query).all()
    return [
        {
            "id": r.id,
            "case_number": r.case_number,
            "case_name": r.case_name,
            "court_name": r.court_name,
            "decision_date": r.decision_date.isoformat() if r.decision_date else None,
            "result": r.result,
            "trial_type": r.trial_type,
        }
        for r in results
    ]
