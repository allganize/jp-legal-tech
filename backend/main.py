from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api import agent, cases, collection, judges, regulation, search, venue
from backend.config import settings
from backend.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="裁判官判決分析ダッシュボード", version="0.1.0", lifespan=lifespan)

_cors_origins = (
    [settings.frontend_url]
    if settings.frontend_url and settings.frontend_url != "http://localhost:3000"
    else ["*"]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(judges.router, prefix="/api/judges", tags=["judges"])
app.include_router(cases.router, prefix="/api/cases", tags=["cases"])
app.include_router(collection.router, prefix="/api/collection", tags=["collection"])
app.include_router(agent.router, prefix="/api/agent", tags=["agent"])
app.include_router(venue.router, prefix="/api/venue", tags=["venue"])
app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(regulation.router, prefix="/api/regulation", tags=["regulation"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
