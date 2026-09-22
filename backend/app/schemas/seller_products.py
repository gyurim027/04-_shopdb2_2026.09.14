"""Pydantic schemas for seller_products.

카테고리, 상품, 옵션, 상품 이미지, 상품 첨부파일,
상품별 판매실적의 요청·응답 형식을 정의한다.
"""

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field


# DB enum(products.product_status)에서 사용하는 값
PRODUCT_STATUSES = (
    "READY",
    "SALE",
    "SOLD_OUT",
    "STOPPED",
    "DELETED",
)

# DB enum(product_images.image_type)에서 사용하는 값
ImageType = Literal[
    "MAIN",
    "DETAIL",
    "THUMBNAIL",
    "OPTION",
]


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------


class SellerCategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    category_id: int
    parent_category_id: int | None
    category_name: str
    category_level: int
    display_order: int
    active_yn: str


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------


class SellerProductCreate(BaseModel):
    """셀러 상품 등록 요청.

    상품 등록 시 기본 SKU와 초기 재고도 함께 생성한다.
    재고 값은 products가 아니라 inventories 테이블에 저장된다.
    """

    category_id: int
    product_code: str = Field(..., max_length=50)
    product_name: str = Field(..., max_length=200)

    short_description: str | None = Field(
        default=None,
        max_length=1000,
    )

    description: str | None = None
    regular_price: Decimal
    sale_price: Decimal
    product_status: str = "READY"

    initial_stock_quantity: int = Field(
        default=0,
        ge=0,
        description="상품 등록 시 설정할 초기 재고 수량",
    )

    safety_stock: int = Field(
        default=0,
        ge=0,
        description="안전재고 수량",
    )


class SellerProductUpdate(BaseModel):
    """셀러 상품 수정 요청."""

    category_id: int | None = None
    product_name: str | None = Field(
        default=None,
        max_length=200,
    )
    short_description: str | None = Field(
        default=None,
        max_length=1000,
    )
    description: str | None = None
    regular_price: Decimal | None = None
    sale_price: Decimal | None = None
    product_status: str | None = None


class SellerProductOut(BaseModel):
    """셀러 상품 응답."""

    model_config = ConfigDict(from_attributes=True)

    product_id: int
    seller_user_id: int
    category_id: int
    product_code: str
    product_name: str
    short_description: str | None
    description: str | None
    regular_price: Decimal
    sale_price: Decimal
    product_status: str
    created_at: datetime
    updated_at: datetime


class SellerProductPage(BaseModel):
    """셀러 상품 목록의 페이지 응답."""

    items: list[SellerProductOut]
    total: int
    page: int
    size: int


# ---------------------------------------------------------------------------
# Product variants
# ---------------------------------------------------------------------------


class SellerVariantCreate(BaseModel):
    """상품 옵션과 해당 옵션의 초기 재고 등록 요청."""

    sku_code: str = Field(
        ...,
        max_length=100,
    )

    option_name1: str | None = Field(
        default=None,
        max_length=100,
    )

    option_value1: str | None = Field(
        default=None,
        max_length=100,
    )

    option_name2: str | None = Field(
        default=None,
        max_length=100,
    )

    option_value2: str | None = Field(
        default=None,
        max_length=100,
    )

    additional_price: Decimal = Decimal("0.00")

    stock_quantity: int = Field(
        default=0,
        ge=0,
        description="옵션의 초기 재고 수량",
    )

    safety_stock: int = Field(
        default=0,
        ge=0,
        description="옵션의 안전재고 수량",
    )

class SellerVariantUpdate(BaseModel):
    """상품 옵션 수정 요청.

    SKU 코드는 등록 이후 변경하지 않는다.
    """

    option_name1: str | None = Field(
        default=None,
        max_length=100,
    )
    option_value1: str | None = Field(
        default=None,
        max_length=100,
    )
    option_name2: str | None = Field(
        default=None,
        max_length=100,
    )
    option_value2: str | None = Field(
        default=None,
        max_length=100,
    )
    additional_price: Decimal | None = None
    active_yn: str | None = Field(
        default=None,
        pattern="^[YN]$",
    )


class SellerVariantOut(BaseModel):
    """상품 옵션 응답."""

    model_config = ConfigDict(from_attributes=True)

    variant_id: int
    product_id: int
    sku_code: str
    option_name1: str | None
    option_value1: str | None
    option_name2: str | None
    option_value2: str | None
    additional_price: Decimal
    active_yn: str


# ---------------------------------------------------------------------------
# File asset
# ---------------------------------------------------------------------------


class SellerFileAssetOut(BaseModel):
    """상품에 연결된 실제 파일 정보.

    storage_path와 stored_file_name은 서버 내부 정보이므로
    셀러 프론트에 전달하지 않는다.
    """

    model_config = ConfigDict(from_attributes=True)

    file_id: int
    original_file_name: str | None = None
    file_extension: str | None = None
    mime_type: str | None = None
    file_size: int | None = 0
    active_yn: str | None = "Y"

    # 프론트에서 미리보기 또는 다운로드할 때 사용할 API 경로
    content_url: str | None = None


# ---------------------------------------------------------------------------
# Product images
# ---------------------------------------------------------------------------


class SellerProductImageCreate(BaseModel):
    """이미 등록된 file_assets 파일을 상품 이미지로 연결하는 요청.

    실제 파일 업로드는 별도의 multipart 업로드 API에서 처리한다.
    """

    file_id: int = Field(..., gt=0)
    image_type: ImageType = "DETAIL"
    alt_text: str | None = Field(
        default=None,
        max_length=500,
    )
    display_order: int = Field(
        default=0,
        ge=0,
    )


class SellerProductImageUpdate(BaseModel):
    """상품 이미지 정보 수정 요청."""

    image_type: ImageType | None = None
    alt_text: str | None = Field(
        default=None,
        max_length=500,
    )
    display_order: int | None = Field(
        default=None,
        ge=0,
    )
    active_yn: str | None = Field(
        default=None,
        pattern="^[YN]$",
    )


class SellerProductImageOut(BaseModel):
    """상품 이미지 응답."""

    model_config = ConfigDict(from_attributes=True)

    product_image_id: int
    product_id: int
    file_id: int
    image_type: ImageType
    alt_text: str | None
    display_order: int
    active_yn: str
    created_at: datetime

    # 연결된 file_assets의 파일 정보
    file: SellerFileAssetOut | None = None


# ---------------------------------------------------------------------------
# Product files
# ---------------------------------------------------------------------------


class SellerProductFileCreate(BaseModel):
    """이미 등록된 file_assets 파일을 상품 첨부파일로 연결하는 요청.

    실제 파일 업로드는 별도의 multipart 업로드 API에서 처리한다.
    """

    file_id: int = Field(..., gt=0)
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


class SellerProductFileUpdate(BaseModel):
    """상품 첨부파일 정보 수정 요청."""

    file_category: str | None = Field(
        default=None,
        max_length=50,
    )
    file_description: str | None = Field(
        default=None,
        max_length=500,
    )
    display_order: int | None = Field(
        default=None,
        ge=0,
    )


class SellerProductFileOut(BaseModel):
    """상품 첨부파일 응답."""

    model_config = ConfigDict(from_attributes=True)

    product_file_id: int
    product_id: int
    file_id: int
    file_category: str | None
    file_description: str | None
    display_order: int
    created_at: datetime

    # 연결된 file_assets의 파일 정보
    file: SellerFileAssetOut | None = None


# ---------------------------------------------------------------------------
# Product sales
# ---------------------------------------------------------------------------


class SellerProductSalesOut(BaseModel):
    """상품별 판매실적 응답."""

    product_id: int
    product_name: str
    sold_quantity: int
    sold_amount: Decimal

    @computed_field
    @property
    def has_sales(self) -> bool:
        return self.sold_quantity > 0