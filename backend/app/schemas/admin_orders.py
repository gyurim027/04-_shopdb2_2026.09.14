from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# 주문 상태 변경 요청 스키마
class OrderStatusUpdate(BaseModel):
    status: str = Field(..., description="변경할 주문 상태 (예: PREPARING, SHIPPING, COMPLETED, CANCELLED)")

# 주문 응답 스키마
class OrderResponse(BaseModel):
    id: int
    user_id: int
    status: str
    total_amount: float
    created_at: datetime

    class Config:
        from_attributes = True

# 결제/정산 내역 응답 스키마
class SettlementResponse(BaseModel):
    id: int
    order_id: int
    amount: float
    status: str
    payment_method: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True