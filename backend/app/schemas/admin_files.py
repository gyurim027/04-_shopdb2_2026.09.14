from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


FileType = Literal[
    "IMAGE",
    "PDF",
    "DOCUMENT",
    "VIDEO",
    "AUDIO",
    "ETC",
]

StorageType = Literal[
    "LOCAL",
    "S3",
    "GCS",
    "NAS",
    "URL",
]


class FileAssetResponse(BaseModel):
    """관리자 파일 조회 응답."""

    model_config = ConfigDict(from_attributes=True)

    file_id: int
    org_id: int | None = None
    file_type: FileType
    storage_type: StorageType
    original_file_name: str | None = None
    stored_file_name: str | None = None
    file_extension: str | None = None
    mime_type: str | None = None
    file_size: int | None = 0
    storage_path: str | None = None
    public_url: str | None = None
    thumbnail_url: str | None = None
    checksum_sha256: str | None = None
    active_yn: str | None = "Y"
    created_at: datetime | None = None


class FileListResponse(BaseModel):
    """파일 목록 조회 응답."""

    total: int
    items: list[FileAssetResponse]


class FileUploadResponse(BaseModel):
    """파일 업로드 성공 응답."""

    message: str = "파일이 정상적으로 등록되었습니다."
    file: FileAssetResponse


class FileDeleteResponse(BaseModel):
    """파일 비활성화 응답."""

    message: str
    file_id: int
    active_yn: str


class FileDomainLinkRequest(BaseModel):
    """파일을 다른 도메인의 데이터와 연결할 때 사용하는 요청."""

    domain_type: Literal[
        "PRODUCT",
        "PRODUCT_IMAGE",
        "INQUIRY",
        "POLICY",
        "RAG_DOCUMENT",
    ]

    domain_id: int = Field(
        ...,
        gt=0,
        description="연결 대상의 PK 값",
    )

    file_category: str | None = Field(
        default=None,
        max_length=50,
    )

    file_description: str | None = Field(
        default=None,
        max_length=500,
    )

    display_order: int = Field(
        default=0,
        ge=0,
    )


class FileDomainLinkResponse(BaseModel):
    """파일-도메인 연결 결과."""

    message: str
    file_id: int
    domain_type: str
    domain_id: int