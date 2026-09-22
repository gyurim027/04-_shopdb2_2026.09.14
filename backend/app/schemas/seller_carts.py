"""Pydantic schemas for seller cart insights (S-CART-01~05).

판매자에게 고객 개인이나 장바구니 한 건의 상세를 보여주지 않고,
현재 cart_items에 남아 있는 상품을 집계한 결과만 반환한다.
"""

from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


class SellerCartSummaryOut(BaseModel):
    """S-CART-01 현재 장바구니 관심 요약."""

    cart_count: int = Field(description="내 상품이 포함된 현재 장바구니 수")
    buyer_count: int = Field(description="내 상품을 담고 있는 고객 수(집계값)")
    total_quantity: int = Field(description="현재 장바구니에 담긴 내 상품 총수량")
    estimated_amount: Decimal = Field(
        description="현재 판매가 기준 장바구니 추정 금액",
    )


class SellerCartProductInsightOut(BaseModel):
    """S-CART-02 상품별 현재 장바구니 관심 순위의 한 행."""

    product_id: int
    product_code: str
    product_name: str
    product_status: str
    cart_count: int
    total_quantity: int
    estimated_amount: Decimal


class SellerCartSkuInsightOut(BaseModel):
    """S-CART-03 옵션(SKU)별 현재 장바구니 관심 순위의 한 행."""

    product_id: int
    product_name: str
    variant_id: int
    sku_code: str
    option_name1: str | None = None
    option_value1: str | None = None
    option_name2: str | None = None
    option_value2: str | None = None
    variant_active_yn: str
    cart_count: int
    total_quantity: int
    stock_quantity: int
    reserved_quantity: int
    available_quantity: int


class SellerCartSelectionStatusOut(BaseModel):
    """S-CART-04 결제 선택 상태별 현재 장바구니 집계."""

    selected_yn: Literal["Y", "N"]
    cart_count: int
    total_quantity: int
    estimated_amount: Decimal


class SellerLongHeldCartItemOut(BaseModel):
    """S-CART-05 장기 보유 구간·옵션별 현재 장바구니 집계."""

    hold_period: Literal["7~29일", "30일 이상"]
    product_id: int
    product_name: str
    variant_id: int
    sku_code: str
    option_name1: str | None = None
    option_value1: str | None = None
    option_name2: str | None = None
    option_value2: str | None = None
    cart_count: int
    total_quantity: int
    estimated_amount: Decimal