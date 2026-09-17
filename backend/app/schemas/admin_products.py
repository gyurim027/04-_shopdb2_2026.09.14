"""Pydantic schemas for admin_products (categories, products, variants, images, files, inventories)."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, computed_field

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
    product_status: str = Field("READY", description="READY, SALE, SOLD_OUT, STOPPED, DELETED")


class ProductUpdate(BaseModel):
    category_id: int | None = None
    product_name: str | None = Field(None, max_length=200)
    short_description: str | None = Field(None, max_length=1000)
    description: str | None = None
    regular_price: Decimal | None = None
    sale_price: Decimal | None = None
    product_status: str | None = Field(None, description="READY, SALE, SOLD_OUT, STOPPED, DELETED")


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


# --- Product images --------------------------------------------------------


class ProductImageCreate(BaseModel):
    file_id: int
    image_type: str = Field("DETAIL", description="MAIN / DETAIL / THUMBNAIL / OPTION")
    alt_text: str | None = Field(None, max_length=500)
    display_order: int = 0


class ProductImageUpdate(BaseModel):
    image_type: str | None = None
    alt_text: str | None = Field(None, max_length=500)
    display_order: int | None = None
    active_yn: str | None = Field(None, pattern="^[YN]$")


class ProductImageOut(BaseModel):
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


class ProductFileCreate(BaseModel):
    file_id: int
    file_category: str | None = Field(None, max_length=50)
    file_description: str | None = Field(None, max_length=500)
    display_order: int = 0


class ProductFileUpdate(BaseModel):
    file_category: str | None = Field(None, max_length=50)
    file_description: str | None = Field(None, max_length=500)
    display_order: int | None = None


class ProductFileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_file_id: int
    product_id: int
    file_id: int
    file_category: str | None
    file_description: str | None
    display_order: int
    created_at: datetime


# --- Inventories -----------------------------------------------------------


class InventoryCreate(BaseModel):
    org_id: int
    variant_id: int
    stock_quantity: int = 0
    reserved_quantity: int = 0
    safety_stock: int = 0


class InventoryUpdate(BaseModel):
    stock_quantity: int | None = None
    reserved_quantity: int | None = None
    safety_stock: int | None = None


class InventoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    inventory_id: int
    org_id: int
    variant_id: int
    stock_quantity: int
    reserved_quantity: int
    safety_stock: int
    updated_at: datetime

    @computed_field
    @property
    def available_quantity(self) -> int:
        return self.stock_quantity - self.reserved_quantity

    @computed_field
    @property
    def is_low_stock(self) -> bool:
        return (self.stock_quantity - self.reserved_quantity) <= self.safety_stock