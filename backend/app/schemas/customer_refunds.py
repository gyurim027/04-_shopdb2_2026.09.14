from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class CustomerRefundItemCreate(BaseModel):
    """
    환불 요청할 주문 상품 한 건.

    환불 금액은 고객이 직접 입력하지 않는다.
    백엔드가 기존 order_items의 구매 당시 단가를 기준으로 계산한다.
    """

    order_item_id: int = Field(
        ge=1,
        description="환불할 주문 상품 ID",
    )

    refund_quantity: int = Field(
        ge=1,
        description="환불 요청 수량",
    )


class CustomerRefundCreateRequest(BaseModel):
    """
    고객 환불 요청.

    고객이 직접 전달하는 값:
    - 주문 ID
    - 환불 사유
    - 환불할 주문 상품과 수량

    환불 금액, 정책 ID, 구매자 ID,
    환불 상태는 백엔드가 결정한다.
    """

    order_id: int = Field(
        ge=1,
        description="환불 요청할 주문 ID",
    )

    refund_reason: str = Field(
        min_length=1,
        max_length=500,
        description="환불 사유",
    )

    items: list[CustomerRefundItemCreate] = Field(
        min_length=1,
        description="환불할 주문 상품 목록",
    )


class CustomerRefundItemResponse(BaseModel):
    """환불 상품 응답"""

    refund_item_id: int
    order_item_id: int

    product_id: int
    variant_id: int | None = None

    product_name_snapshot: str
    sku_snapshot: str | None = None

    ordered_quantity: int
    refund_quantity: int

    unit_price: Decimal
    refund_amount: Decimal


class CustomerRefundResponse(BaseModel):
    """고객 환불 요청 상세 응답"""

    refund_request_id: int

    order_id: int
    order_no: str

    buyer_user_id: int

    refund_policy_id: int | None = None

    refund_reason: str | None = None

    requested_amount: Decimal | None = None
    approved_amount: Decimal | None = None

    refund_status: str

    requested_at: datetime | None = None
    approved_at: datetime | None = None
    completed_at: datetime | None = None

    items: list[CustomerRefundItemResponse] = Field(
        default_factory=list,
    )


class CustomerRefundListItemResponse(BaseModel):
    """내 환불 요청 목록 한 건"""

    refund_request_id: int

    order_id: int
    order_no: str

    refund_reason: str | None = None

    requested_amount: Decimal | None = None
    approved_amount: Decimal | None = None

    refund_status: str

    requested_at: datetime | None = None
    approved_at: datetime | None = None
    completed_at: datetime | None = None


class CustomerRefundListResponse(BaseModel):
    """내 환불 요청 목록 응답"""

    items: list[CustomerRefundListItemResponse] = Field(
        default_factory=list,
    )

    total: int
    page: int
    size: int


class CustomerRefundStatusResponse(BaseModel):
    """환불 처리 상태 조회"""

    refund_request_id: int
    order_id: int
    order_no: str

    refund_status: str

    requested_amount: Decimal | None = None
    approved_amount: Decimal | None = None

    requested_at: datetime | None = None
    approved_at: datetime | None = None
    completed_at: datetime | None = None


class CustomerRefundPolicyResponse(BaseModel):
    """고객에게 보여줄 현재 환불 정책"""

    refund_policy_id: int

    org_id: int | None = None

    policy_name: str
    allowed_days: int

    unopened_refund_yn: str
    opened_refund_yn: str
    defective_refund_yn: str

    shipping_fee_payer: str

    refund_policy_text: str | None = None

    effective_from: date
    effective_to: date | None = None

    active_yn: str