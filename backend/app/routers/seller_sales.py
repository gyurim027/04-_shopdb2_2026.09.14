"""Router for Seller Sales domain (S-SALES-01~04)."""

from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import AuthContext, require_seller
from app.schemas.seller_sales import (
    SellerDailySalesOut,
    SellerPaidSalesOut,
    SellerProductSalesOut,
    SellerSkuSalesOut,
)
from app.services import seller_sales as service

router = APIRouter(prefix="/seller/sales", tags=["Seller Sales"])


@router.get("/daily", response_model=list[SellerDailySalesOut])
def list_daily_sales(
    from_dt: date | None = None,
    to_dt: date | None = None,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> list[SellerDailySalesOut]:
    return service.list_daily_sales(db, auth, from_dt=from_dt, to_dt=to_dt)


@router.get("/products", response_model=list[SellerProductSalesOut])
def list_product_sales(
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> list[SellerProductSalesOut]:
    return service.list_product_sales(db, auth)


@router.get("/skus", response_model=list[SellerSkuSalesOut])
def list_sku_sales(
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> list[SellerSkuSalesOut]:
    return service.list_sku_sales(db, auth)


@router.get("/paid-total", response_model=SellerPaidSalesOut)
def get_paid_sales_total(
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerPaidSalesOut:
    return service.get_paid_sales_total(db, auth)
