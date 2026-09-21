from datetime import datetime

from pydantic import BaseModel, Field


class CustomerReturnItemCreate(BaseModel):
    """
    고객이 반품 신청할 주문상품 한 건.
    """

    order_item_id: int = Field(
        ge=1,
        description="반품할 주문상품 ID",
    )

    return_quantity: int = Field(
        ge=1,
        description="반품 신청 수량",
    )


class CustomerReturnCreateRequest(BaseModel):
    """
    고객 반품 신청.

    한 번의 요청에서 여러 판매사의 상품을 선택할 수 있다.

    백엔드는 선택된 주문상품의 판매자를 확인한 뒤
    판매사별로 return_requests를 각각 생성한다.
    """

    order_id: int = Field(
        ge=1,
        description="반품 신청할 주문 ID",
    )

    return_reason_code: str = Field(
        min_length=1,
        max_length=50,
        description="반품 사유 코드",
    )

    return_reason_detail: str | None = Field(
        default=None,
        max_length=1000,
        description="반품 사유 상세",
    )

    pickup_method: str = Field(
        min_length=1,
        max_length=20,
        description="회수 방식: PICKUP 또는 SELF_SHIP",
    )

    items: list[CustomerReturnItemCreate] = Field(
        min_length=1,
        description="반품할 주문상품 목록",
    )


class CustomerReturnItemResponse(BaseModel):
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


class CustomerReturnResponse(BaseModel):
    return_request_id: int

    order_id: int
    order_no: str

    return_reason_code: str
    return_reason_detail: str | None = None

    return_status: str
    pickup_method: str

    carrier_name: str | None = None
    tracking_no: str | None = None

    requested_at: datetime | None = None
    pickup_at: datetime | None = None
    received_at: datetime | None = None
    inspected_at: datetime | None = None
    completed_at: datetime | None = None

    refund_request_id: int | None = None

    items: list[CustomerReturnItemResponse] = Field(
        default_factory=list,
    )


class CustomerReturnCreateResponse(BaseModel):
    """
    고객 반품 신청 생성 결과.

    한 번의 반품 신청이라도 판매사가 여러 명이면
    판매사별로 여러 return_request가 생성될 수 있다.

    예:
    고객이 판매사 A 상품 + 판매사 B 상품을 함께 신청

    → return_request 1
       판매사 A 상품

    → return_request 2
       판매사 B 상품
    """

    requests: list[CustomerReturnResponse] = Field(
        default_factory=list,
    )

    total: int


class CustomerReturnListItemResponse(BaseModel):
    return_request_id: int

    order_id: int
    order_no: str

    return_reason_code: str
    return_reason_detail: str | None = None

    return_status: str
    pickup_method: str

    carrier_name: str | None = None
    tracking_no: str | None = None

    requested_at: datetime | None = None
    completed_at: datetime | None = None

    refund_request_id: int | None = None


class CustomerReturnListResponse(BaseModel):
    items: list[CustomerReturnListItemResponse] = Field(
        default_factory=list,
    )

    total: int
    page: int
    size: int


class CustomerReturnStatusResponse(BaseModel):
    return_request_id: int

    order_id: int
    order_no: str

    return_status: str
    pickup_method: str

    carrier_name: str | None = None
    tracking_no: str | None = None

    requested_at: datetime | None = None
    pickup_at: datetime | None = None
    received_at: datetime | None = None
    inspected_at: datetime | None = None
    completed_at: datetime | None = None

    refund_request_id: int | None = None