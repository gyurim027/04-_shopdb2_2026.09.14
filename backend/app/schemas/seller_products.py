"""Pydantic schemas for seller_products (categories 조회, products, variants, images, files, 판매실적)."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, computed_field

# DB enum(products.product_status) 그대로 사용
PRODUCT_STATUSES = ("READY", "SALE", "SOLD_OUT", "STOPPED", "DELETED")


# --- Categories (읽기 전용) --------------------------------------------------


class SellerCategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    category_id: int
    parent_category_id: int | None
    category_name: str
    category_level: int
    display_order: int
    active_yn: str


# --- Products ------------------------------------------------------------
# seller_user_id는 어드민과 달리 클라이언트가 지정하지 않는다. 서버에서 auth.user_id로 강제한다.


class SellerProductCreate(BaseModel):
    category_id: int
    product_code: str = Field(..., max_length=50)
    product_name: str = Field(..., max_length=200)
    short_description: str | None = Field(None, max_length=1000)
    description: str | None = None
    regular_price: Decimal
    sale_price: Decimal
    product_status: str = "READY"


class SellerProductUpdate(BaseModel):
    category_id: int | None = None
    product_name: str | None = Field(None, max_length=200)
    short_description: str | None = Field(None, max_length=1000)
    description: str | None = None
    regular_price: Decimal | None = None
    sale_price: Decimal | None = None
    product_status: str | None = None


class SellerProductOut(BaseModel):
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
    items: list[SellerProductOut]
    total: int
    page: int
    size: int


# --- Product variants (SKU) ----------------------------------------------


class SellerVariantCreate(BaseModel):
    sku_code: str = Field(..., max_length=100)
    option_name1: str | None = Field(None, max_length=100)
    option_value1: str | None = Field(None, max_length=100)
    option_name2: str | None = Field(None, max_length=100)
    option_value2: str | None = Field(None, max_length=100)
    additional_price: Decimal = Decimal("0.00")


class SellerVariantUpdate(BaseModel):
    option_name1: str | None = Field(None, max_length=100)
    option_value1: str | None = Field(None, max_length=100)
    option_name2: str | None = Field(None, max_length=100)
    option_value2: str | None = Field(None, max_length=100)
    additional_price: Decimal | None = None
    active_yn: str | None = Field(None, pattern="^[YN]$")


class SellerVariantOut(BaseModel):
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


# --- Product images --------------------------------------------------------
# DB enum(product_images.image_type): MAIN / DETAIL / THUMBNAIL / OPTION


class SellerProductImageCreate(BaseModel):
    file_id: int
    image_type: str = "DETAIL"
    alt_text: str | None = Field(None, max_length=500)
    display_order: int = 0


class SellerProductImageUpdate(BaseModel):
    image_type: str | None = None
    alt_text: str | None = Field(None, max_length=500)
    display_order: int | None = None
    active_yn: str | None = Field(None, pattern="^[YN]$")


class SellerProductImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_image_id: int
    product_id: int
    file_id: int
    image_type: str
    alt_text: str | None
    display_order: int
    active_yn: str
    created_at: datetime


# --- Product files (첨부파일) ------------------------------------------------
# 이 테이블엔 active_yn이 없어 삭제는 소프트 삭제가 아니라 실제 DELETE로 처리한다.


class SellerProductFileCreate(BaseModel):
    file_id: int
    file_category: str | None = Field(None, max_length=50)
    file_description: str | None = Field(None, max_length=500)
    display_order: int = 0


class SellerProductFileUpdate(BaseModel):
    file_category: str | None = Field(None, max_length=50)
    file_description: str | None = Field(None, max_length=500)
    display_order: int | None = None


class SellerProductFileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_file_id: int
    product_id: int
    file_id: int
    file_category: str | None
    file_description: str | None
    display_order: int
    created_at: datetime


# --- 상품별 판매실적 (S-PROD-09) ---------------------------------------------


class SellerProductSalesOut(BaseModel):
    product_id: int
    product_name: str
    sold_quantity: int
    sold_amount: Decimal

    @computed_field
    @property
    def has_sales(self) -> bool:
        return self.sold_quantity > 0
