from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class CustomerOrderCreateItem(BaseModel):
    """고객 주문 상품 한 건"""

    product_id: int = Field(
        ge=1,
        description="상품 ID",
    )

    variant_id: int = Field(
        ge=1,
        description="상품 옵션(SKU) ID",
    )

    quantity: int = Field(
        ge=1,
        le=100,
        description="주문 수량",
    )


class CustomerOrderCreateRequest(BaseModel):
    """
    고객 주문 생성 요청.

    장바구니 기능은 현재 구현하지 않는다.

    고객이 선택하는 정보:
    - 배송지
    - 상품
    - 옵션
    - 수량

    가격, 주문번호, 주문상태, org_id 등은
    고객이 직접 전달하지 않고 백엔드에서 결정한다.
    """

    address_id: int = Field(
        ge=1,
        description="등록된 배송지 ID",
    )

    items: list[CustomerOrderCreateItem] = Field(
        min_length=1,
        description="주문할 상품 목록",
    )


class CustomerOrderItemResponse(BaseModel):
    """주문 상품 응답"""

    order_item_id: int

    product_id: int
    variant_id: int | None = None

    product_name_snapshot: str
    sku_snapshot: str | None = None

    quantity: int

    unit_price: Decimal
    item_amount: Decimal

    item_status: str


class CustomerOrderListItemResponse(BaseModel):
    """내 주문 목록 한 건"""

    order_id: int
    order_no: str

    order_status: str

    product_amount: Decimal
    discount_amount: Decimal
    shipping_amount: Decimal
    total_amount: Decimal

    ordered_at: datetime
    updated_at: datetime


class CustomerOrderListResponse(BaseModel):
    """내 주문 목록 응답"""

    items: list[CustomerOrderListItemResponse] = Field(
        default_factory=list,
    )

    total: int
    page: int
    size: int


class CustomerOrderDetailResponse(BaseModel):
    """내 주문 상세 응답"""

    order_id: int
    order_no: str

    buyer_user_id: int
    org_id: int

    order_status: str

    product_amount: Decimal
    discount_amount: Decimal
    shipping_amount: Decimal
    total_amount: Decimal

    receiver_name: str | None = None
    receiver_phone: str | None = None
    zipcode: str | None = None

    shipping_address1: str | None = None
    shipping_address2: str | None = None

    ordered_at: datetime
    updated_at: datetime

    items: list[CustomerOrderItemResponse] = Field(
        default_factory=list,
    )


class CustomerOrderStatusResponse(BaseModel):
    """고객 주문 상태 조회 응답"""

    order_id: int
    order_no: str
    order_status: str

    ordered_at: datetime
    updated_at: datetime