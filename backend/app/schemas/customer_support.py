from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


class CustomerInquiryCreateRequest(BaseModel):
    """
    고객 문의 작성 요청.

    고객이 직접 입력하는 값만 받는다.
    user_id, org_id, inquiry_status 등은
    백엔드에서 결정한다.
    """

    category_code: str = Field(
        min_length=1,
        max_length=50,
        description="문의 카테고리 코드",
        examples=["PRODUCT"],
    )

    title: str = Field(
        min_length=1,
        max_length=200,
        description="문의 제목",
    )

    content: str = Field(
        min_length=1,
        description="문의 내용",
    )

    secret_yn: Literal["Y", "N"] = Field(
        default="N",
        description="비밀 문의 여부",
    )


class CustomerInquiryFileResponse(BaseModel):
    """
    문의에 연결된 첨부파일 정보.
    """

    inquiry_file_id: int
    file_id: int

    file_type: str

    original_file_name: str | None = None
    file_extension: str | None = None
    mime_type: str | None = None
    file_size: int | None = None

    public_url: str | None = None
    thumbnail_url: str | None = None

    created_at: datetime | None = None


class CustomerInquiryResponse(BaseModel):
    """
    고객 문의 상세 응답.
    """

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

    files: list[CustomerInquiryFileResponse] = Field(
        default_factory=list,
    )


class CustomerInquiryListItemResponse(BaseModel):
    """
    고객 문의 목록 한 건.
    """

    inquiry_id: int

    category_code: str

    title: str

    inquiry_status: str
    secret_yn: str

    has_answer: bool

    created_at: datetime | None = None
    updated_at: datetime | None = None
    answered_at: datetime | None = None


class CustomerInquiryListResponse(BaseModel):
    """
    내 문의 목록 응답.
    """

    items: list[CustomerInquiryListItemResponse] = Field(
        default_factory=list,
    )

    total: int
    page: int
    size: int


class CustomerInquiryStatusResponse(BaseModel):
    """
    문의 답변 상태 조회.
    """

    inquiry_id: int

    inquiry_status: str

    answer_content: str | None = None

    created_at: datetime | None = None
    answered_at: datetime | None = None


class CustomerInquiryFileUploadResponse(BaseModel):
    """
    문의 첨부파일 업로드 결과.
    """

    message: str
    inquiry_id: int
    file: CustomerInquiryFileResponse


class CustomerPolicyListItemResponse(BaseModel):
    """
    고객에게 공개할 회사 정책 목록 한 건.
    """

    policy_id: int

    policy_code: str
    policy_name: str
    policy_version: str

    policy_type: str | None = None

    effective_from: date
    effective_to: date | None = None


class CustomerPolicyResponse(BaseModel):
    """
    고객에게 공개할 회사 정책 상세.
    """

    policy_id: int

    org_id: int | None = None

    policy_code: str
    policy_name: str
    policy_version: str

    policy_type: str | None = None
    policy_content: str | None = None

    effective_from: date
    effective_to: date | None = None

    active_yn: str | None = None