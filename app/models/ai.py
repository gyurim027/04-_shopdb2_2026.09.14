from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CHAR,
    DateTime,
    Enum,
    Integer,
    JSON,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


# =========================================================
# AI Provider
# =========================================================


class AIProvider(Base):
    """OpenAI, Gemini, Ollama 등 AI 제공자 설정."""

    __tablename__ = "ai_providers"

    provider_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )

    provider_code: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        unique=True,
    )

    provider_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    provider_type: Mapped[str] = mapped_column(
        Enum(
            "CLOUD",
            "LOCAL",
        ),
        nullable=False,
    )

    base_url: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )

    chat_model: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )

    embedding_model: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )

    active_yn: Mapped[str | None] = mapped_column(
        CHAR(1),
        nullable=True,
        server_default=text("'Y'"),
    )

    created_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        server_default=text("CURRENT_TIMESTAMP"),
    )


# =========================================================
# RAG 문서
# =========================================================


class RAGDocument(Base):
    """RAG 시스템에서 사용하는 원본 문서."""

    __tablename__ = "rag_documents"

    document_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )

    provider_id: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )

    org_id: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )

    document_type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    document_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    source_type: Mapped[str | None] = mapped_column(
        Enum(
            "DATABASE",
            "FILE",
            "URL",
            "API",
            "MANUAL",
        ),
        nullable=True,
    )

    source_uri: Mapped[str | None] = mapped_column(
        String(2000),
        nullable=True,
    )

    content_text: Mapped[str | None] = mapped_column(
        LONGTEXT,
        nullable=True,
    )

    version: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    document_status: Mapped[str | None] = mapped_column(
        Enum(
            "READY",
            "PROCESSING",
            "INDEXED",
            "ERROR",
        ),
        nullable=True,
        server_default=text("'READY'"),
    )

    created_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        server_default=text("CURRENT_TIMESTAMP"),
        server_onupdate=text("CURRENT_TIMESTAMP"),
    )


# =========================================================
# AI 질문/답변 로그
# =========================================================


class RAGQueryLog(Base):
    """사용자의 AI 질문과 AI 응답 기록."""

    __tablename__ = "rag_query_logs"

    query_log_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )

    user_id: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )

    provider_id: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )

    question_text: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    response_text: Mapped[str | None] = mapped_column(
        LONGTEXT,
        nullable=True,
    )

    retrieved_chunk_ids: Mapped[list | dict | None] = mapped_column(
        JSON,
        nullable=True,
    )

    prompt_tokens: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        server_default=text("0"),
    )

    completion_tokens: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        server_default=text("0"),
    )

    response_time_ms: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    created_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        server_default=text("CURRENT_TIMESTAMP"),
    )