from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api import agent, cases, collection, judges, regulation
from backend.config import settings
from backend.database import SessionLocal, init_db
from backend.services.regulation_seed import seed_regulation_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    # 규제 에이전트 mock 데이터 자동 시딩
    db = SessionLocal()
    try:
        seed_regulation_data(db)
    finally:
        db.close()
    yield


app = FastAPI(title="판사 판결 분석 대시보드", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(judges.router, prefix="/api/judges", tags=["judges"])
app.include_router(cases.router, prefix="/api/cases", tags=["cases"])
app.include_router(collection.router, prefix="/api/collection", tags=["collection"])
app.include_router(agent.router, prefix="/api/agent", tags=["agent"])
app.include_router(regulation.router, prefix="/api/regulation", tags=["regulation"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
