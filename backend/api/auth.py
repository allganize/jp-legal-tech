"""OIDC 인증 엔드포인트 — Alli OIDC Provider 연동."""

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, RedirectResponse

from backend.config import settings
from backend.oidc_client import oauth

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/login")
async def login(request: Request):
    """Alli OIDC 로그인 페이지로 리다이렉트."""
    if not settings.oidc_client_id:
        return JSONResponse({"error": "OIDC not configured"}, status_code=503)
    return await oauth.alli.authorize_redirect(request, settings.oidc_redirect_uri)


@router.get("/callback")
async def callback(request: Request):
    """인증 코드 → 토큰 교환, 세션 생성 후 프론트엔드로 리다이렉트."""
    token = await oauth.alli.authorize_access_token(request)
    userinfo = token.get("userinfo", {})

    request.session["user"] = {
        "sub": userinfo.get("sub", ""),
        "email": userinfo.get("email", ""),
        "name": userinfo.get("name", ""),
    }
    request.session["access_token"] = token.get("access_token", "")

    return RedirectResponse(url="/")


@router.get("/me")
async def me(request: Request):
    """현재 로그인된 사용자 정보 반환."""
    user = request.session.get("user")
    if not user:
        return JSONResponse({"error": "not authenticated"}, status_code=401)
    return user


@router.post("/logout")
async def logout(request: Request):
    """세션 삭제 + 로그아웃."""
    request.session.clear()
    return {"status": "logged out"}
