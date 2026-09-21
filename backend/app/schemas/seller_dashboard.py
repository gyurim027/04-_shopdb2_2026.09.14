"""Pydantic schemas for seller_dashboard.

스키마는 API가 반환할 데이터의 모양을 정의한다.
여기서는 DB 조회나 계산을 수행하지 않는다.
"""

from decimal import Decimal

from pydantic import BaseModel


class SellerProductStatusSummaryOut(BaseModel):
    """판매 상태별 상품 개수."""

    product_status: str
    count: int


class SellerOrderSummaryOut(BaseModel):
    """판매자의 주문과 주문상품 수량."""

    order_count: int
    item_quantity: int


class SellerSalesSummaryOut(BaseModel):
    """판매자의 총 판매금액."""

    sales_amount: Decimal


class SellerLowStockSummaryOut(BaseModel):
    """안전재고 이하 상품 옵션 개수."""

    low_stock_count: int


class SellerRefundSummaryOut(BaseModel):
    """처리 대기 중인 환불 건수와 금액."""

    pending_refund_count: int
    pending_refund_amount: Decimal


class SellerReturnSummaryOut(BaseModel):
    """판매자가 처리해야 하는 반품 요청 건수."""

    pending_return_count: int