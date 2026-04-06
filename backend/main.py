from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.sessions import SessionMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from backend.api import agent, auth, cases, collection, judges, search, strategy, venue

try:
    from backend.api import regulation
except ImportError:
    regulation = None  # type: ignore
from backend.config import settings
from backend.database import init_db

# OIDC가 설정되지 않으면 인증 비활성 (로컬 개발 편의)
_AUTH_ENABLED = bool(settings.oidc_client_id)
_PUBLIC_PREFIXES = ("/api/health", "/api/auth/")


class OIDCAuthMiddleware(BaseHTTPMiddleware):
    """세션 기반 OIDC 인증 미들웨어. OIDC 미설정 시 비활성."""

    async def dispatch(self, request: Request, call_next):
        if not _AUTH_ENABLED:
            return await call_next(request)

        path = request.url.path

        if request.method == "OPTIONS":
            return await call_next(request)
        for prefix in _PUBLIC_PREFIXES:
            if path.startswith(prefix):
                return await call_next(request)

        # API 요청만 인증 검사 (프론트엔드 정적 파일은 Next.js가 서빙)
        if not path.startswith("/api/"):
            return await call_next(request)

        user = request.session.get("user")
        if user:
            return await call_next(request)

        return JSONResponse({"error": "not authenticated"}, status_code=401)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="裁判官判決分析ダッシュボード", version="0.1.0", lifespan=lifespan)

# 미들웨어 (역순으로 실행: Session → CORS → OIDC)
app.add_middleware(OIDCAuthMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# authlib OIDC가 세션에 state/nonce를 저장하므로 SessionMiddleware 필수
app.add_middleware(SessionMiddleware, secret_key=settings.session_secret)

# Auth 라우터
app.include_router(auth.router)

# 기존 라우터
app.include_router(judges.router, prefix="/api/judges", tags=["judges"])
app.include_router(cases.router, prefix="/api/cases", tags=["cases"])
app.include_router(collection.router, prefix="/api/collection", tags=["collection"])
app.include_router(agent.router, prefix="/api/agent", tags=["agent"])
app.include_router(venue.router, prefix="/api/venue", tags=["venue"])
app.include_router(search.router, prefix="/api/search", tags=["search"])
if regulation:
    app.include_router(regulation.router, prefix="/api/regulation", tags=["regulation"])
app.include_router(strategy.router, prefix="/api/strategy", tags=["strategy"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
