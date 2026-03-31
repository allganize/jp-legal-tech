from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    db_path: Path = Path(__file__).parent.parent / "data" / "jp-legal.db"

    # Data source (path to cloned japanese-law-analysis/data_set repo)
    data_source_path: Path = Path("/tmp/jp-data")

    # Claude API
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-opus-4-20250514"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    frontend_url: str = "http://localhost:3000"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
