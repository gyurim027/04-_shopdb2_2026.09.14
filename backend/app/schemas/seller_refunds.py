"""Pydantic schemas for seller_refunds (S-REF-01~02).

S-REF-03(환불 승인/거절)은 04_관리자권한매트릭스 §3.4상 최고관리자/지점장(어드민) 전용
업무로 문서화되어 있어 이번 셀러 콘솔 범위에서는 제외했다(조회만 제공).
"""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class SellerRefundRequestOut(BaseModel):
    refund_request_id: int
    order_id: int
    refund_reason: str | None
    requested_amount: Decimal | None
    approved_amount: Decimal | None
    refund_status: str
    requested_at: datetime | None


class SellerRefundItemOut(BaseModel):
    refund_item_id: int
    order_item_id: int
    product_name_snapshot: str | None
    refund_quantity: int
    refund_amount: Decimal


class SellerRefundDetailOut(SellerRefundRequestOut):
    items: list[SellerRefundItemOut]
