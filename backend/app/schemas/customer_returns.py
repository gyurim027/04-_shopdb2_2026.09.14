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

    고객이 직접 입력하는 값:
    - 주문 ID
    - 반품 사유 코드
    - 반품 사유 상세
    - 회수 방식
    - 반품할 주문상품과 수량

    반품 상태, 검수 결과, 환불 요청 ID 등은
    백엔드 또는 관리자가 처리한다.
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
    """
    고객 반품상품 응답.
    """

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
    """
    고객 반품 요청 상세 응답.
    """

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


class CustomerReturnListItemResponse(BaseModel):
    """
    고객 반품 요청 목록 한 건.
    """

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
    """
    고객 반품 요청 목록 응답.
    """

    items: list[CustomerReturnListItemResponse] = Field(
        default_factory=list,
    )

    total: int
    page: int
    size: int


class CustomerReturnStatusResponse(BaseModel):
    """
    고객 반품 처리 상태 조회.
    """

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