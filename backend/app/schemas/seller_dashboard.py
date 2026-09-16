"""Pydantic schemas for seller_dashboard (S-DASH-01~05)."""

from decimal import Decimal

from pydantic import BaseModel


class SellerProductStatusSummaryOut(BaseModel):
    product_status: str
    count: int


class SellerOrderSummaryOut(BaseModel):
    order_count: int
    item_quantity: int


class SellerSalesSummaryOut(BaseModel):
    sales_amount: Decimal


class SellerLowStockSummaryOut(BaseModel):
    low_stock_count: int


class SellerRefundSummaryOut(BaseModel):
    pending_refund_count: int
    pending_refund_amount: Decimal
