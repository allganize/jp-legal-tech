from authlib.integrations.starlette_client import OAuth

from backend.config import settings

oauth = OAuth()

if settings.oidc_issuer_url and settings.oidc_client_id:
    oauth.register(
        name="alli",
        client_id=settings.oidc_client_id,
        client_secret=settings.oidc_client_secret,
        server_metadata_url=f"{settings.oidc_issuer_url}/.well-known/openid-configuration",
        client_kwargs={"scope": "openid profile email"},
        code_challenge_method="S256",
    )
