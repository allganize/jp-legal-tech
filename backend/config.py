from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # law.go.kr API
    law_api_base: str = "http://www.law.go.kr/DRF"
    law_api_oc: str = "hyominapi"
    law_api_rate_limit: int = 10  # max concurrent requests
    law_api_delay: float = 0.2  # seconds between batches

    # Database
    db_path: Path = Path(__file__).parent.parent / "data" / "machu-picchu.db"

    # Claude API
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-20250514"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    frontend_url: str = "http://localhost:3000"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
