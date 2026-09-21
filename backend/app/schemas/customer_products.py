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
    """고객 화면에 노출되는 상품 이미지"""

    product_image_id: int
    file_id: int
    image_type: str
    alt_text: str | None = None
    display_order: int

    public_url: str | None = None
    thumbnail_url: str | None = None

    # 셀러가 서버에 업로드한 LOCAL 이미지를
    # 고객 프론트에서 조회하기 위한 고객 전용 URL
    content_url: str | None = None


class CustomerProductSellerResponse(BaseModel):
    """
    특정 상품 옵션을 판매하는 판매사 정보.

    org_id:
    장바구니에 상품을 담을 때 함께 전달한다.

    available_quantity:
    해당 판매사의 해당 옵션 구매 가능 재고.
    """

    org_id: int
    org_name: str

    seller_name: str | None = None

    available_quantity: int = 0


class CustomerProductVariantResponse(BaseModel):
    """
    고객이 선택할 수 있는 상품 옵션(SKU).

    available_quantity:
    모든 판매사의 구매 가능 재고 합계.

    sellers:
    해당 옵션을 판매하는 판매사별 정보.
    """

    variant_id: int
    sku_code: str

    option_name1: str | None = None
    option_value1: str | None = None

    option_name2: str | None = None
    option_value2: str | None = None

    additional_price: Decimal

    available_quantity: int = 0

    sellers: list[CustomerProductSellerResponse] = Field(
        default_factory=list,
    )


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

    main_image_url: str | None = None


class CustomerProductListResponse(BaseModel):
    """고객 상품 목록 / 검색 응답"""

    items: list[CustomerProductListItem] = Field(
        default_factory=list,
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
        default_factory=list,
    )

    variants: list[CustomerProductVariantResponse] = Field(
        default_factory=list,
    )