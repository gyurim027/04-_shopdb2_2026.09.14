"""Pydantic schemas for admin_orders (orders, payments/settlements)."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

# 주문 상태 변경 요청 스키마
class OrderStatusUpdate(BaseModel):
    status: str = Field(..., description="변경할 주문 상태 (예: PREPARING, SHIPPING, COMPLETED, CANCELLED)")

# 주문 응답 스키마
class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    order_id: int = Field(..., alias="order_id")  # id -> order_id 수정
    buyer_user_id: int                            # user_id -> buyer_user_id 수정
    order_status: str                             # status -> order_status 수정
    total_amount: float
    created_at: datetime

# 결제/정산 내역 응답 스키마
class SettlementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    payment_id: int = Field(..., alias="payment_id") # id -> payment_id 수정
    order_id: int
    amount: float
    payment_status: str                           # status -> payment_status 수정
    payment_method: Optional[str] = None
    approved_at: Optional[datetime] = None        # 승인 일시 추가
    receipt_url: Optional[str] = None             # 영수증 URL 추가
    created_at: datetime