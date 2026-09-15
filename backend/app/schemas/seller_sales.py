"""Pydantic schemas for seller_sales (S-SALES-01~04)."""

from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class SellerDailySalesOut(BaseModel):
    sale_date: date
    order_count: int
    sales_amount: Decimal


class SellerProductSalesOut(BaseModel):
    product_id: int
    product_name: str
    sold_quantity: int
    sold_amount: Decimal


class SellerSkuSalesOut(BaseModel):
    variant_id: int
    sku_code: str
    product_name: str
    sold_quantity: int
    sold_amount: Decimal


class SellerPaidSalesOut(BaseModel):
    total_amount: Decimal
