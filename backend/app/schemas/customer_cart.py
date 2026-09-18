from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


class CustomerCartItemAddRequest(BaseModel):
    """
    장바구니 상품 추가 요청.

    org_id:
    어느 판매사(조직)의 상품인지 구분한다.

    variant_id:
    상품 옵션(SKU)을 구분한다.
    """

    org_id: int = Field(
        ge=1,
        description="판매사 조직 ID",
    )

    variant_id: int = Field(
        ge=1,
        description="상품 옵션(SKU) ID",
    )

    quantity: int = Field(
        ge=1,
        le=100,
        description="장바구니에 담을 수량",
    )


class CustomerCartItemQuantityUpdateRequest(BaseModel):
    """
    장바구니 상품 수량 변경 요청.
    """

    quantity: int = Field(
        ge=1,
        le=100,
        description="변경할 수량",
    )


class CustomerCartItemSelectedUpdateRequest(BaseModel):
    """
    장바구니 상품 주문 선택 여부 변경 요청.

    Y:
    이번 주문에 포함

    N:
    장바구니에는 남겨두지만 이번 주문에서는 제외
    """

    selected_yn: Literal["Y", "N"] = Field(
        description="주문 선택 여부: Y 또는 N",
    )


class CustomerCartItemResponse(BaseModel):
    """
    장바구니 상품 한 건 응답.
    """

    cart_item_id: int

    org_id: int
    org_name: str
    seller_name: str | None = None

    product_id: int
    variant_id: int

    product_name: str
    sku_code: str

    option_name1: str | None = None
    option_value1: str | None = None

    option_name2: str | None = None
    option_value2: str | None = None

    sale_price: Decimal
    additional_price: Decimal
    unit_price: Decimal

    quantity: int
    item_amount: Decimal

    selected_yn: Literal["Y", "N"]

    available_quantity: int

    product_status: str
    variant_active_yn: str

    main_image_url: str | None = None

    added_at: datetime
    updated_at: datetime


class CustomerCartResponse(BaseModel):
    """
    로그인한 고객의 현재 장바구니 응답.

    프론트에서는 각 item의 org_id를 기준으로
    판매사별 그룹을 만들 수 있다.
    """

    cart_id: int | None = None
    buyer_user_id: int

    items: list[CustomerCartItemResponse] = Field(
        default_factory=list,
    )

    total_item_count: int = 0
    selected_item_count: int = 0

    total_quantity: int = 0
    selected_quantity: int = 0

    total_amount: Decimal = Decimal("0.00")
    selected_amount: Decimal = Decimal("0.00")