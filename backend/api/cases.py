from fastapi import APIRouter, Depends, HTTPException
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
