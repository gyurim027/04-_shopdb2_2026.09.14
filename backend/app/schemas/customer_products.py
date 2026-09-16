from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class CustomerCategoryResponse(BaseModel):
    """고객 화면에서 사용하는 카테고리 정보"""

    category_id: int
    parent_category_id: int | None = None
    category_name: str
    category_level: int
    display_order: int


class CustomerProductImageResponse(BaseModel):
    """고객 화면에 노출할 상품 이미지"""

    product_image_id: int
    file_id: int
    image_type: str
    alt_text: str | None = None
    display_order: int

    # file_assets에서 조회
    public_url: str | None = None
    thumbnail_url: str | None = None


class CustomerProductVariantResponse(BaseModel):
    """고객이 선택할 수 있는 상품 옵션(SKU)"""

    variant_id: int
    sku_code: str

    option_name1: str | None = None
    option_value1: str | None = None

    option_name2: str | None = None
    option_value2: str | None = None

    additional_price: Decimal

    # inventories에서 계산한 구매 가능 수량
    available_quantity: int = 0


class CustomerProductListItem(BaseModel):
    """고객 상품 목록 한 건"""

    product_id: int
    category_id: int
    category_name: str | None = None

    product_code: str
    product_name: str

    short_description: str | None = None

    regular_price: Decimal
    sale_price: Decimal

    product_status: str

    # 대표 이미지
    main_image_url: str | None = None


class CustomerProductListResponse(BaseModel):
    """고객 상품 목록 / 검색 응답"""

    items: list[CustomerProductListItem] = Field(
        default_factory=list
    )

    total: int
    page: int
    size: int


class CustomerProductDetailResponse(BaseModel):
    """고객 상품 상세 조회 응답"""

    product_id: int

    category_id: int
    category_name: str | None = None

    product_code: str
    product_name: str

    short_description: str | None = None
    description: str | None = None

    regular_price: Decimal
    sale_price: Decimal

    product_status: str

    created_at: datetime
    updated_at: datetime

    images: list[CustomerProductImageResponse] = Field(
        default_factory=list
    )

    variants: list[CustomerProductVariantResponse] = Field(
        default_factory=list
    )