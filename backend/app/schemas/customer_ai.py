from datetime import datetime

from pydantic import BaseModel, Field


class CustomerAIChatRequest(BaseModel):
    """
    고객 AI 챗봇 질문 요청.
    """

    question: str = Field(
        min_length=1,
        max_length=2000,
        description="고객 질문",
    )


class CustomerAIRetrievedChunkResponse(BaseModel):
    """
    AI 답변에 참고한 RAG 청크 정보.
    """

    chunk_id: int
    document_id: int

    document_name: str
    document_type: str | None = None

    chunk_text: str


class CustomerAIChatResponse(BaseModel):
    """
    고객 AI 챗봇 응답.
    """

    query_log_id: int

    question: str
    answer: str | None = None

    provider_id: int | None = None
    provider_code: str | None = None

    retrieved_chunk_ids: list[int] = Field(
        default_factory=list,
    )

    retrieved_chunks: list[
        CustomerAIRetrievedChunkResponse
    ] = Field(
        default_factory=list,
    )

    failed: bool = False

    created_at: datetime | None = None


class CustomerAIQueryLogListItemResponse(BaseModel):
    """
    고객 본인의 AI 질문 기록 한 건.
    """

    query_log_id: int

    question_text: str | None = None
    response_text: str | None = None

    provider_id: int | None = None

    retrieved_chunk_ids: list[int] = Field(
        default_factory=list,
    )

    response_time_ms: int | None = None

    failed: bool = False

    created_at: datetime | None = None


class CustomerAIQueryLogListResponse(BaseModel):
    """
    고객 본인의 AI 질문 기록 목록.
    """

    items: list[
        CustomerAIQueryLogListItemResponse
    ] = Field(
        default_factory=list,
    )

    total: int
    page: int
    size: int


class CustomerAIInquiryConvertRequest(BaseModel):
    """
    AI 답변 실패 로그를 고객 문의로 전환할 때 사용하는 요청.
    """

    title: str | None = Field(
        default=None,
        max_length=200,
    )

    secret_yn: str = Field(
        default="N",
        pattern="^[YN]$",
    )


class CustomerAIInquiryConvertResponse(BaseModel):
    """
    AI 답변 실패 → 고객 문의 전환 결과.
    """

    query_log_id: int
    inquiry_id: int

    inquiry_status: str

    message: str