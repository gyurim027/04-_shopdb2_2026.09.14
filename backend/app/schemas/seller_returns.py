"""Pydantic schemas for seller_returns (S-RET-01~07).

고객이 생성한 반품 요청을 판매자가 조회하고,
회수 진행, 상품 검수, 승인 또는 반려하기 위한 요청/응답 스키마다.

DB 구조는 변경하지 않는다.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


ReturnStatus = Literal[
    "REQUESTED",
    "PICKUP_REQUESTED",
    "PICKED_UP",
    "RECEIVED",
    "INSPECTING",
    "APPROVED",
    "REJECTED",
    "COMPLETED",
    "CANCELLED",
]

PickupProgressStatus = Literal[
    "PICKUP_REQUESTED",
    "PICKED_UP",
    "RECEIVED",
]

InspectionResult = Literal[
    "APPROVED",
    "REJECTED",
]

SellerReturnDecision = Literal[
    "APPROVED",
    "REJECTED",
]


class SellerReturnItemOut(BaseModel):
    """판매자가 확인하는 반품 상품 한 건."""

    return_item_id: int
    order_item_id: int

    product_id: int
    variant_id: int | None = None

    product_name_snapshot: str
    sku_snapshot: str | None = None

    ordered_quantity: int
    return_quantity: int

    item_condition: str | None = None
    inspection_result: str
    inspection_note: str | None = None


class SellerReturnListItemOut(BaseModel):
    """판매자 반품 요청 목록의 한 행."""

    return_request_id: int

    order_id: int
    order_no: str

    buyer_user_id: int
    buyer_name: str | None = None

    return_reason_code: str
    return_reason_detail: str | None = None

    return_status: ReturnStatus
    pickup_method: str

    carrier_name: str | None = None
    tracking_no: str | None = None

    requested_at: datetime | None = None
    pickup_at: datetime | None = None
    received_at: datetime | None = None
    inspected_at: datetime | None = None
    completed_at: datetime | None = None

    refund_request_id: int | None = None

    item_count: int = 0
    total_return_quantity: int = 0


class SellerReturnListOut(BaseModel):
    """판매자 반품 요청 목록 응답."""

    items: list[SellerReturnListItemOut] = Field(
        default_factory=list,
    )

    total: int
    page: int
    size: int


class SellerReturnDetailOut(SellerReturnListItemOut):
    """판매자 반품 요청 상세 응답."""

    items: list[SellerReturnItemOut] = Field(
        default_factory=list,
    )


class SellerReturnPickupUpdateRequest(BaseModel):
    """반품 상품의 회수 진행 정보 변경."""

    return_status: PickupProgressStatus = Field(
        description=(
            "회수 진행 상태: "
            "PICKUP_REQUESTED, PICKED_UP 또는 RECEIVED"
        ),
    )

    carrier_name: str | None = Field(
        default=None,
        max_length=100,
        description="택배사명",
    )

    tracking_no: str | None = Field(
        default=None,
        max_length=100,
        description="운송장 번호",
    )


class SellerReturnInspectionUpdateRequest(BaseModel):
    """반품 상품 한 건의 검수 결과 입력."""

    item_condition: str = Field(
        min_length=1,
        max_length=100,
        description="상품 상태",
    )

    inspection_result: InspectionResult = Field(
        description="검수 결과: APPROVED 또는 REJECTED",
    )

    inspection_note: str | None = Field(
        default=None,
        max_length=1000,
        description="검수 의견",
    )


class SellerReturnDecisionRequest(BaseModel):
    """판매자의 최종 반품 승인 또는 반려 요청."""

    decision: SellerReturnDecision = Field(
        description="판매자 결정: APPROVED 또는 REJECTED",
    )