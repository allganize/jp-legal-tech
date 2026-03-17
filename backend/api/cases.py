from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Case

router = APIRouter()


@router.get("/{case_id}")
def get_case(case_id: int, db: Session = Depends(get_db)):
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
        "case_type_name": case.case_type_name,
        "decision_date": case.decision_date.isoformat() if case.decision_date else None,
        "decision_type": case.decision_type,
        "summary": case.summary,
        "ruling_gist": case.ruling_gist,
        "reference_articles": case.reference_articles,
        "reference_cases": case.reference_cases,
        "full_text": case.full_text,
        "judges": judges,
    }
