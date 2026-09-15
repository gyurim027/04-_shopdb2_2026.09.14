"""Pydantic schemas for admin_refunds (refund_policies, refund_requests, refund_items)."""

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

REFUND_STATUSES = ("REQUESTED", "REVIEWING", "APPROVED", "REJECTED", "COMPLETED")
SHIPPING_FEE_PAYERS = ("BUYER", "SELLER", "COMPANY")


# --- Refund policies ---------------------------------------------------


class RefundPolicyCreate(BaseModel):
    org_id: int | None = None
    policy_name: str = Field(..., max_length=200)
    allowed_days: int
    unopened_refund_yn: str = Field("Y", pattern="^[YN]$")
    opened_refund_yn: str = Field("N", pattern="^[YN]$")
    defective_refund_yn: str = Field("Y", pattern="^[YN]$")
    shipping_fee_payer: str = "BUYER"
    refund_policy_text: str | None = None
    effective_from: date
    effective_to: date | None = None


class RefundPolicyUpdate(BaseModel):
    policy_name: str | None = Field(None, max_length=200)
    allowed_days: int | None = None
    unopened_refund_yn: str | None = Field(None, pattern="^[YN]$")
    opened_refund_yn: str | None = Field(None, pattern="^[YN]$")
    defective_refund_yn: str | None = Field(None, pattern="^[YN]$")
    shipping_fee_payer: str | None = None
    refund_policy_text: str | None = None
    effective_from: date | None = None
    effective_to: date | None = None
    active_yn: str | None = Field(None, pattern="^[YN]$")


class RefundPolicyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    refund_policy_id: int
    org_id: int | None
    policy_name: str
    allowed_days: int
    unopened_refund_yn: str
    opened_refund_yn: str
    defective_refund_yn: str
    shipping_fee_payer: str
    refund_policy_text: str | None
    effective_from: date
    effective_to: date | None
    active_yn: str


# --- Refund requests -----------------------------------------------------
# 생성(신청)은 대고객 화면에서 발생하므로 여기엔 Create 스키마가 없다.
# 어드민은 조회 + 승인/거절 처리만 한다.


class RefundRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    refund_request_id: int
    order_id: int
    buyer_user_id: int
    refund_policy_id: int | None
    refund_reason: str | None
    requested_amount: Decimal | None
    approved_amount: Decimal | None
    refund_status: str
    requested_at: datetime | None
    approved_at: datetime | None
    completed_at: datetime | None


class RefundApprove(BaseModel):
    approved_amount: Decimal | None = None  # 생략 시 requested_amount 그대로 승인


# --- Refund items ----------------------------------------------------------
# refund_requests 신청 시 함께 생성되므로 어드민은 조회만 한다.


class RefundItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    refund_item_id: int
    refund_request_id: int
    order_item_id: int
    refund_quantity: int
    refund_amount: Decimal
