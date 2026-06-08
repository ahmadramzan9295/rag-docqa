"""Centralised settings – loaded once at startup."""
from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── LLM ───────────────────────────────────────────────────────────────────
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    openrouter_api_key: str = ""
    llm_provider: Literal["anthropic", "openai", "openrouter"] = "anthropic"
    llm_model: str = "claude-3-5-sonnet-20241022"

    # ── Embeddings ────────────────────────────────────────────────────────────
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_device: str = "cpu"

    # ── FAISS ─────────────────────────────────────────────────────────────────
    faiss_index_path: Path = Path("./data/faiss_index")
    chunk_size: int = 512
    chunk_overlap: int = 64
    retriever_k: int = 6
    mmr_fetch_k: int = 20

    # ── Auth ──────────────────────────────────────────────────────────────────
    secret_key: str = "dev-secret-change-in-prod"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    # ── Storage ───────────────────────────────────────────────────────────────
    storage_backend: Literal["local", "s3", "gcs"] = "local"
    local_upload_dir: Path = Path("./data/uploads")
    aws_bucket_name: str = ""
    aws_region: str = "us-east-1"
    gcs_bucket_name: str = ""

    # ── App ───────────────────────────────────────────────────────────────────
    app_env: Literal["development", "production"] = "development"
    max_file_size_mb: int = 50
    allowed_extensions: str = "pdf,docx,txt"

    # ── Observability ─────────────────────────────────────────────────────────
    langchain_tracing_v2: bool = False
    langchain_api_key: str = ""
    langchain_project: str = "rag-docqa"

    @field_validator("faiss_index_path", "local_upload_dir", mode="before")
    @classmethod
    def _make_path(cls, v: str | Path) -> Path:
        p = Path(v)
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def allowed_ext_list(self) -> list[str]:
        return [e.strip().lower() for e in self.allowed_extensions.split(",")]

    @property
    def max_file_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024


settings = Settings()
