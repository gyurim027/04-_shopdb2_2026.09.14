"""Pydantic schemas for seller_inventory (S-INV-01~04)."""

from datetime import datetime

from pydantic import BaseModel, computed_field


class SellerInventoryOut(BaseModel):
    inventory_id: int
    product_id: int
    product_name: str
    variant_id: int
    sku_code: str
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


class SellerInventoryUpdate(BaseModel):
    stock_quantity: int | None = None
    safety_stock: int | None = None


class SellerReservedInventoryOut(BaseModel):
    variant_id: int
    product_id: int
    product_name: str
    sku_code: str
    stock_quantity: int
    reserved_quantity: int

    @computed_field
    @property
    def available_quantity(self) -> int:
        return self.stock_quantity - self.reserved_quantity
