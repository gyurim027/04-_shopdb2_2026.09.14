"""Pydantic schemas for seller_orders (S-ORD-01~05)."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

# order_items.item_status는 DB enum이 아니라 varchar라 애플리케이션에서 허용값을 제한한다.
ORDER_ITEM_STATUSES = ("ORDERED", "PREPARING", "SHIPPING", "DELIVERED", "COMPLETED", "CANCELLED")


class SellerOrderSummaryOut(BaseModel):
    order_id: int
    order_no: str
    order_status: str
    ordered_at: datetime
    my_item_count: int
    my_item_amount: Decimal


class SellerOrderItemOut(BaseModel):
    order_item_id: int
    product_id: int
    product_name_snapshot: str
    sku_snapshot: str | None
    quantity: int
    unit_price: Decimal
    item_amount: Decimal
    item_status: str


class SellerOrderDetailOut(BaseModel):
    order_id: int
    order_no: str
    order_status: str
    ordered_at: datetime
    receiver_name: str
    receiver_phone: str
    items: list[SellerOrderItemOut]


class SellerOrderItemStatusUpdate(BaseModel):
    item_status: str = Field(..., description=f"허용값: {ORDER_ITEM_STATUSES}")


class SellerPaymentOut(BaseModel):
    payment_status: str
    payment_method: str | None
    approved_at: datetime | None


class SellerReceiptOut(BaseModel):
    receipt_url: str | None
