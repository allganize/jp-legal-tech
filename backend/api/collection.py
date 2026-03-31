from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.services.stats_service import get_collection_stats

router = APIRouter()


@router.get("/status")
def collection_status(db: Session = Depends(get_db)):
    """データインポート状況を返す。"""
    return get_collection_stats(db)
