"""Runtime configuration loaded from environment variables."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """API settings; override via `.env` or process environment."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    project_name: str = "HealthTech Ecosystem API"
    api_v1_prefix: str = "/api/v1"
    database_url: str = (
        "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/healthtech"
    )
    sql_echo: bool = False


settings = Settings()
