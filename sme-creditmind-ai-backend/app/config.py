from __future__ import annotations

from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

# Backend repo root (directory that contains `app/`). Used so `.env` loads regardless of process cwd.
_BACKEND_ROOT = Path(__file__).resolve().parent.parent


def _default_sqlite_url() -> str:
    return f"sqlite:///{_BACKEND_ROOT / 'creditmind.db'}"


class Settings(BaseSettings):
    APP_NAME: str = "CreditMind AI Backend"
    DATABASE_URL: str = _default_sqlite_url()
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    QWEN_API_KEY: str = ""
    QWEN_BASE_URL: str = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
    # Vision: native VL + OCR for POS / bills / statements (Singapore Model Studio snapshot ids).
    QWEN_MODEL: str = "qwen3.6-plus-2026-04-02"
    # Text-only: analyzer + credit scoring JSON steps.
    QWEN_TEXT_MODEL: str = "qwen3-max-2026-01-23"
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_ORG: str = ""
    OPENAI_PROJECT: str = ""
    # Per HTTP call to DashScope; vision + JSON steps can exceed 35s.
    LLM_TIMEOUT_SECONDS: float = 90.0

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def _empty_database_url_means_default(cls, value: object) -> object:
        # `.env` often sets CREDITMIND_DATABASE_URL=` which overrides the default with "" and breaks SQLAlchemy.
        if value is None or (isinstance(value, str) and not value.strip()):
            return _default_sqlite_url()
        return value

    @field_validator("QWEN_API_KEY", "OPENAI_API_KEY", mode="before")
    @classmethod
    def _strip_api_keys(cls, value: object) -> str:
        if value is None:
            return ""
        return str(value).strip()

    model_config = SettingsConfigDict(
        env_prefix="CREDITMIND_",
        # Load order: `.env` then `.env.local` (later file overrides). Missing files are skipped.
        env_file=(
            _BACKEND_ROOT / ".env",
            _BACKEND_ROOT / ".env.local",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
