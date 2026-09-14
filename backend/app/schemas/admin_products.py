"""Pydantic schemas for admin_products (categories, products, variants, images, files, inventories)."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

# DB enum(products.product_status) 그대로 사용
PRODUCT_STATUSES = ("READY", "SALE", "SOLD_OUT", "STOPPED", "DELETED")


class CategoryCreate(BaseModel):
    category_name: str = Field(..., max_length=100)
    parent_category_id: int | None = None
    category_level: int = 1
    display_order: int = 0


class CategoryUpdate(BaseModel):
    category_name: str | None = Field(None, max_length=100)
    parent_category_id: int | None = None
    category_level: int | None = None
    display_order: int | None = None
    active_yn: str | None = Field(None, pattern="^[YN]$")


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    category_id: int
    parent_category_id: int | None
    category_name: str
    category_level: int
    display_order: int
    active_yn: str


# --- Products ------------------------------------------------------------


class ProductCreate(BaseModel):
    seller_user_id: int
    category_id: int
    product_code: str = Field(..., max_length=50)
    product_name: str = Field(..., max_length=200)
    short_description: str | None = Field(None, max_length=1000)
    description: str | None = None
    regular_price: Decimal
    sale_price: Decimal
    product_status: str = "READY"


class ProductUpdate(BaseModel):
    category_id: int | None = None
    product_name: str | None = Field(None, max_length=200)
    short_description: str | None = Field(None, max_length=1000)
    description: str | None = None
    regular_price: Decimal | None = None
    sale_price: Decimal | None = None
    product_status: str | None = None


class ProductOut(BaseModel):
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


class ProductPage(BaseModel):
    items: list[ProductOut]
    total: int
    page: int
    size: int


# --- Product variants (SKU) ----------------------------------------------


class VariantCreate(BaseModel):
    sku_code: str = Field(..., max_length=100)
    option_name1: str | None = Field(None, max_length=100)
    option_value1: str | None = Field(None, max_length=100)
    option_name2: str | None = Field(None, max_length=100)
    option_value2: str | None = Field(None, max_length=100)
    additional_price: Decimal = Decimal("0.00")


class VariantUpdate(BaseModel):
    option_name1: str | None = Field(None, max_length=100)
    option_value1: str | None = Field(None, max_length=100)
    option_name2: str | None = Field(None, max_length=100)
    option_value2: str | None = Field(None, max_length=100)
    additional_price: Decimal | None = None
    active_yn: str | None = Field(None, pattern="^[YN]$")


class VariantOut(BaseModel):
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
