from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api import agent, cases, collection, judges, regulation, venue
from backend.config import settings
from backend.database import SessionLocal, init_db
from backend.services.outcome_parser import backfill_court_names, parse_all_outcomes
from backend.services.regulation_seed import seed_regulation_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    # 규제 에이전트 mock 데이터 자동 시딩
    db = SessionLocal()
    try:
        seed_regulation_data(db)
        # case_number에서 빈 court_name 복구
        backfilled = backfill_court_names(db)
        if backfilled > 0:
            print(f"[backfill] court_name {backfilled}건 복구 완료")
        # 판결문에서 결과(인용/기각) 파싱
        stats = parse_all_outcomes(db)
        if stats.get("_classified", 0) > 0:
            print(f"[outcome_parser] {stats['_classified']}/{stats['_total']}건 분류 완료")
    finally:
        db.close()
    yield


app = FastAPI(title="판사 판결 분석 대시보드", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3006",
        "https://frontend-rust-phi-14.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(judges.router, prefix="/api/judges", tags=["judges"])
app.include_router(cases.router, prefix="/api/cases", tags=["cases"])
app.include_router(collection.router, prefix="/api/collection", tags=["collection"])
app.include_router(agent.router, prefix="/api/agent", tags=["agent"])
app.include_router(regulation.router, prefix="/api/regulation", tags=["regulation"])
app.include_router(venue.router, prefix="/api/venue", tags=["venue"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
