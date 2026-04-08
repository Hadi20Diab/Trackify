from __future__ import annotations

from functools import lru_cache
from typing import Annotated, Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    project_name: str = "Trackify API"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:4200"]

    supabase_url: str
    supabase_service_role_key: str
    supabase_anon_key: str | None = None
    supabase_password_reset_redirect_url: str = "http://localhost:4200/auth/login"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Any) -> list[str]:
        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return []
            if stripped.startswith("[") and stripped.endswith("]"):
                stripped = stripped[1:-1]
            return [item.strip().strip('"').strip("'") for item in stripped.split(",") if item.strip()]
        if isinstance(value, list):
            return [str(item) for item in value]
        raise ValueError("Invalid CORS origins format")


@lru_cache
def get_settings() -> Settings:
    return Settings()
