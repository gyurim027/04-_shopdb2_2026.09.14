from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


# =========================================================
# 공통 타입
# =========================================================


ProviderType = Literal[
    "CLOUD",
    "LOCAL",
]

ActiveYN = Literal[
    "Y",
    "N",
]

RAGSourceType = Literal[
    "DATABASE",
    "FILE",
    "URL",
    "API",
    "MANUAL",
]

RAGDocumentStatus = Literal[
    "READY",
    "PROCESSING",
    "INDEXED",
    "ERROR",
]


# =========================================================
# AI Provider 관리
# =========================================================


class AIProviderCreateRequest(BaseModel):
    """AI Provider 등록 요청."""

    provider_code: str = Field(
        ...,
        min_length=1,
        max_length=50,
    )

    provider_name: str = Field(
        ...,
        min_length=1,
        max_length=100,
    )

    provider_type: ProviderType

    base_url: str | None = Field(
        default=None,
        max_length=1000,
    )

    chat_model: str | None = Field(
        default=None,
        max_length=200,
    )

    embedding_model: str | None = Field(
        default=None,
        max_length=200,
    )

    active_yn: ActiveYN = "Y"


class AIProviderUpdateRequest(BaseModel):
    """AI Provider 설정 수정 요청."""

    provider_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )

    provider_type: ProviderType | None = None

    base_url: str | None = Field(
        default=None,
        max_length=1000,
    )

    chat_model: str | None = Field(
        default=None,
        max_length=200,
    )

    embedding_model: str | None = Field(
        default=None,
        max_length=200,
    )

    active_yn: ActiveYN | None = None


class AIProviderResponse(BaseModel):
    """AI Provider 조회 응답."""

    model_config = ConfigDict(from_attributes=True)

    provider_id: int
    provider_code: str
    provider_name: str
    provider_type: ProviderType
    base_url: str | None = None
    chat_model: str | None = None
    embedding_model: str | None = None
    active_yn: str | None = "Y"
    created_at: datetime | None = None


class AIProviderListResponse(BaseModel):
    """AI Provider 목록 응답."""

    total: int
    items: list[AIProviderResponse]


# =========================================================
# RAG 문서 관리
# =========================================================


class RAGDocumentCreateRequest(BaseModel):
    """RAG 문서 등록 요청."""

    provider_id: int | None = Field(
        default=None,
        gt=0,
    )

    org_id: int | None = Field(
        default=None,
        gt=0,
    )

    document_type: str | None = Field(
        default=None,
        max_length=50,
    )

    document_name: str = Field(
        ...,
        min_length=1,
        max_length=255,
    )

    source_type: RAGSourceType | None = None

    source_uri: str | None = Field(
        default=None,
        max_length=2000,
    )

    content_text: str | None = None

    version: str | None = Field(
        default=None,
        max_length=50,
    )

    document_status: RAGDocumentStatus = "READY"


class RAGDocumentStatusUpdateRequest(BaseModel):
    """RAG 문서 처리 상태 변경 요청."""

    document_status: RAGDocumentStatus


class RAGDocumentResponse(BaseModel):
    """RAG 문서 조회 응답."""

    model_config = ConfigDict(from_attributes=True)

    document_id: int
    provider_id: int | None = None
    org_id: int | None = None
    document_type: str | None = None
    document_name: str
    source_type: RAGSourceType | None = None
    source_uri: str | None = None
    content_text: str | None = None
    version: str | None = None
    document_status: RAGDocumentStatus | None = "READY"
    created_at: datetime | None = None
    updated_at: datetime | None = None


class RAGDocumentListResponse(BaseModel):
    """RAG 문서 목록 응답."""

    total: int
    items: list[RAGDocumentResponse]


# =========================================================
# AI 질문 / 답변 로그
# =========================================================


class RAGQueryLogCreateRequest(BaseModel):
    """AI 질문/답변 로그 등록 요청."""

    user_id: int | None = Field(
        default=None,
        gt=0,
    )

    provider_id: int | None = Field(
        default=None,
        gt=0,
    )

    question_text: str | None = None

    response_text: str | None = None

    retrieved_chunk_ids: list[int] | dict[str, Any] | None = None

    prompt_tokens: int = Field(
        default=0,
        ge=0,
    )

    completion_tokens: int = Field(
        default=0,
        ge=0,
    )

    response_time_ms: int | None = Field(
        default=None,
        ge=0,
    )


class RAGQueryLogResponse(BaseModel):
    """AI 질문/답변 로그 조회 응답."""

    model_config = ConfigDict(from_attributes=True)

    query_log_id: int
    user_id: int | None = None
    provider_id: int | None = None
    question_text: str | None = None
    response_text: str | None = None
    retrieved_chunk_ids: list[int] | dict[str, Any] | None = None
    prompt_tokens: int | None = 0
    completion_tokens: int | None = 0
    response_time_ms: int | None = None
    created_at: datetime | None = None


class RAGQueryLogListResponse(BaseModel):
    """AI 질문/답변 로그 목록 응답."""

    total: int
    items: list[RAGQueryLogResponse]


# =========================================================
# AI 품질 모니터링
# =========================================================


class AIQualityMonitoringResponse(BaseModel):
    """AI 응답 품질 모니터링 통계."""

    total_logs: int

    failed_logs: int

    failure_rate: float

    average_response_time_ms: float

    average_prompt_tokens: float

    average_completion_tokens: float

    average_total_tokens: float


# =========================================================
# AI 답변 실패 → 문의 전환
# =========================================================


class AIQueryToInquiryRequest(BaseModel):
    """AI 답변 실패 로그를 고객 문의로 전환."""

    user_id: int | None = Field(
        default=None,
        gt=0,
        description=(
            "로그에 사용자 정보가 없을 경우 사용할 사용자 ID"
        ),
    )

    category_code: str = Field(
        default="AI",
        min_length=1,
        max_length=50,
    )

    title: str | None = Field(
        default=None,
        max_length=200,
    )

    secret_yn: Literal["Y", "N"] = "N"


class AIQueryToInquiryResponse(BaseModel):
    """AI 로그 → 문의 전환 결과."""

    message: str

    query_log_id: int

    inquiry_id: int