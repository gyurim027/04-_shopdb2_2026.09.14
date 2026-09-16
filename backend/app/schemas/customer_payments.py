from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


class CustomerPaymentRequestCreate(BaseModel):
    """
    고객 결제 요청.

    결제 금액은 고객이 전달하지 않는다.
    order_id를 기준으로 백엔드가
    orders.total_amount를 조회해서 사용한다.
    """

    order_id: int = Field(
        ge=1,
        description="결제할 주문 ID",
    )

    pg_provider: Literal[
        "TOSS",
        "KAKAOPAY",
    ] = Field(
        default="TOSS",
        description="결제 PG사",
    )

    payment_method: Literal[
        "CARD",
        "TRANSFER",
        "EASY_PAY",
    ] = Field(
        default="CARD",
        description="결제 수단",
    )


class CustomerPaymentApproveRequest(BaseModel):
    """
    고객 결제 승인 요청.

    실제 PG 연동 시 프론트에서 PG 인증 후
    전달받은 payment_key와 승인 금액을 사용한다.

    amount는 반드시 DB의 requested_amount와
    일치하는지 백엔드에서 다시 검증한다.
    """

    payment_key: str = Field(
        min_length=1,
        max_length=255,
        description="PG 결제 키",
    )

    amount: Decimal = Field(
        gt=0,
        description="PG에서 승인 요청할 금액",
    )

    pg_transaction_id: str | None = Field(
        default=None,
        max_length=255,
        description="PG 거래 ID",
    )

    receipt_url: str | None = Field(
        default=None,
        max_length=2000,
        description="결제 영수증 URL",
    )


class CustomerPaymentTransactionResponse(BaseModel):
    """결제 처리 이력"""

    transaction_id: int
    payment_id: int

    transaction_key: str | None = None

    transaction_type: str
    transaction_status: str | None = None

    transaction_amount: Decimal

    pg_transaction_id: str | None = None
    idempotency_key: str | None = None

    created_at: datetime


class CustomerPaymentResponse(BaseModel):
    """고객 결제 정보 응답"""

    payment_id: int
    order_id: int

    pg_provider: str

    payment_key: str | None = None
    pg_order_id: str | None = None
    customer_key: str | None = None

    payment_type: str | None = None
    payment_method: str | None = None
    payment_status: str | None = None

    requested_amount: Decimal
    approved_amount: Decimal
    cancelled_amount: Decimal
    balance_amount: Decimal

    currency: str

    receipt_url: str | None = None

    requested_at: datetime | None = None
    approved_at: datetime | None = None
    cancelled_at: datetime | None = None
    created_at: datetime

    transactions: list[
        CustomerPaymentTransactionResponse
    ] = Field(
        default_factory=list,
    )


class CustomerPaymentStatusResponse(BaseModel):
    """고객 결제 상태 조회"""

    payment_id: int
    order_id: int

    payment_status: str | None = None
    order_status: str

    requested_amount: Decimal
    approved_amount: Decimal
    balance_amount: Decimal

    requested_at: datetime | None = None
    approved_at: datetime | None = None