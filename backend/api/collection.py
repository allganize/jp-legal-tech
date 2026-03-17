import asyncio
from typing import Literal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.collector.pipeline import pipeline
from backend.database import get_db
from backend.services.stats_service import get_collection_stats

router = APIRouter()


@router.get("/status")
def collection_status(db: Session = Depends(get_db)):
    stats = get_collection_stats(db)
    stats["is_running"] = pipeline.is_running
    return stats


@router.post("/start/{phase}")
async def start_collection(phase: Literal["search", "detail", "parse", "all"]):
    if pipeline.is_running:
        return {"status": "already_running"}

    async def run_phase():
        if phase == "search":
            await pipeline.run_search_phase()
        elif phase == "detail":
            await pipeline.run_detail_phase()
        elif phase == "parse":
            await pipeline.run_parse_phase()
        elif phase == "all":
            await pipeline.run_search_phase()
            await pipeline.run_detail_phase()
            await pipeline.run_parse_phase()

    asyncio.create_task(run_phase())
    return {"status": "started", "phase": phase}


@router.post("/stop")
def stop_collection():
    pipeline.stop()
    return {"status": "stopped"}
