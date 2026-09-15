from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


# =========================================================
# 문의 관리
# =========================================================


class InquiryResponse(BaseModel):
    """관리자 문의 조회 응답."""

    model_config = ConfigDict(from_attributes=True)

    inquiry_id: int
    user_id: int
    org_id: int | None = None
    category_code: str
    title: str
    content: str
    inquiry_status: str
    secret_yn: str
    answer_content: str | None = None
    answered_by_user_id: int | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    answered_at: datetime | None = None


class InquiryListResponse(BaseModel):
    """문의 목록 조회 응답."""

    total: int
    items: list[InquiryResponse]


class InquiryAnswerRequest(BaseModel):
    """관리자 문의 답변 요청."""

    answer_content: str = Field(
        ...,
        min_length=1,
        description="관리자가 작성하는 문의 답변",
    )


class InquiryAnswerResponse(BaseModel):
    """문의 답변 완료 응답."""

    message: str
    inquiry: InquiryResponse


# =========================================================
# 회사 정책 관리
# =========================================================


class PolicyCreateRequest(BaseModel):
    """새 정책 생성 요청."""

    org_id: int | None = None

    policy_code: str = Field(
        ...,
        min_length=1,
        max_length=50,
    )

    policy_name: str = Field(
        ...,
        min_length=1,
        max_length=200,
    )

    policy_version: str = Field(
        ...,
        min_length=1,
        max_length=30,
    )

    policy_type: str | None = Field(
        default=None,
        max_length=50,
    )

    policy_content: str | None = None

    effective_from: date

    effective_to: date | None = None


class PolicyVersionCreateRequest(BaseModel):
    """기존 정책을 기준으로 새 버전을 생성하는 요청."""

    policy_version: str = Field(
        ...,
        min_length=1,
        max_length=30,
    )

    effective_from: date

    effective_to: date | None = None

    policy_content: str | None = None


class PolicyResponse(BaseModel):
    """정책 조회 응답."""

    model_config = ConfigDict(from_attributes=True)

    policy_id: int
    org_id: int | None = None
    policy_code: str
    policy_name: str
    policy_version: str
    policy_type: str | None = None
    policy_content: str | None = None
    effective_from: date
    effective_to: date | None = None
    active_yn: str | None = "Y"
    created_at: datetime | None = None


class PolicyListResponse(BaseModel):
    """정책 목록 및 버전 목록 응답."""

    total: int
    items: list[PolicyResponse]


class PolicyDeactivateResponse(BaseModel):
    """정책 비활성화 응답."""

    message: str
    policy_id: int
    active_yn: str