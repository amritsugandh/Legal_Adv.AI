"""
LegalLens — Application Configuration
Loads settings from environment variables / .env file.
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

_backend_dir = Path(__file__).resolve().parent.parent
_env_files = [str(_backend_dir / ".env"), ".env"]


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    APP_NAME: str = "LegalLens"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Google Gemini API
    GOOGLE_API_KEY: str = ""

    # File Storage
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 50

    # ChromaDB
    CHROMA_PERSIST_DIR: str = "./chroma_db"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./legal_lens.db"

    # LLM Settings
    LLM_MODEL: str = "gemini-2.0-flash"
    EMBEDDING_MODEL: str = "models/text-embedding-004"

    # CORS — includes all common dev ports + vercel wildcard pattern
    # In production set CORS_ORIGINS env var to your exact Vercel URL
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        # Vercel preview + production deployments
        "https://legal-adv-kmyc9r1re-amritsugandhs-projects.vercel.app",
        "https://legal-adv-ai.vercel.app",
    ]

    model_config = SettingsConfigDict(
        env_file=_env_files,
        env_file_encoding="utf-8",
        extra="ignore",
        # Allow CORS_ORIGINS to be supplied as a comma-separated string
        # (e.g. from docker-compose or Render env vars) in addition to
        # the default JSON-array format that pydantic-settings v2 expects.
        env_list_separator=",",
    )


# Singleton settings instance
settings = Settings()


def ensure_directories():
    """Create required directories if they don't exist."""
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    Path(settings.CHROMA_PERSIST_DIR).mkdir(parents=True, exist_ok=True)
