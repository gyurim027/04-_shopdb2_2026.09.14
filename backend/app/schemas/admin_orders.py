"""Pydantic schemas for admin_orders (orders, payments/settlements, dashboard)."""

from datetime import datetime
from typing import Optional
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field

# 주문 상태 변경 요청 스키마
class OrderStatusUpdate(BaseModel):
    status: str = Field(..., description="변경할 주문 상태 (예: PREPARING, SHIPPING, COMPLETED, CANCELLED)")

# 주문 응답 스키마
class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    order_id: int
    order_no: str
    buyer_user_id: int
    org_id: int
    order_status: str
    product_amount: Decimal
    discount_amount: Decimal
    shipping_amount: Decimal
    total_amount: Decimal
    receiver_name: Optional[str] = None
    receiver_phone: Optional[str] = None
    zipcode: Optional[str] = None
    shipping_address1: Optional[str] = None
    shipping_address2: Optional[str] = None
    ordered_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# 결제/정산 내역 응답 스키마
class SettlementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    payment_id: int
    order_id: int
    pg_provider: str
    payment_key: Optional[str] = None
    pg_order_id: Optional[str] = None
    payment_method: Optional[str] = None
    payment_status: Optional[str] = None
    requested_amount: Decimal
    approved_amount: Decimal
    cancelled_amount: Decimal
    balance_amount: Decimal
    currency: str
    receipt_url: Optional[str] = None
    requested_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    created_at: datetime

# 대시보드 요약 지표 응답 스키마
class DashboardSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    total_orders_count: int
    pending_orders_count: int
    total_sales_amount: Decimal
    low_stock_count: int
    unanswered_inquiries_count: int