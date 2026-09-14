"""Pydantic schemas for admin_products (categories, products, variants, images, files, inventories)."""

from pydantic import BaseModel, ConfigDict, Field


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
