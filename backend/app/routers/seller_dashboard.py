"""Router for Seller Dashboard domain (S-DASH-01~05)."""

from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import AuthContext, require_seller
from app.schemas.seller_dashboard import (
    SellerLowStockSummaryOut,
    SellerOrderSummaryOut,
    SellerProductStatusSummaryOut,
    SellerRefundSummaryOut,
    SellerSalesSummaryOut,
)
from app.services import seller_dashboard as service

router = APIRouter(prefix="/seller/dashboard", tags=["Seller Dashboard"])


@router.get("/product-status", response_model=list[SellerProductStatusSummaryOut])
def get_product_status_summary(
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> list[SellerProductStatusSummaryOut]:
    return service.get_product_status_summary(db, auth)


@router.get("/orders", response_model=SellerOrderSummaryOut)
def get_order_summary(
    from_dt: date | None = None,
    to_dt: date | None = None,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerOrderSummaryOut:
    return service.get_order_summary(db, auth, from_dt, to_dt)


@router.get("/sales", response_model=SellerSalesSummaryOut)
def get_sales_summary(
    from_dt: date | None = None,
    to_dt: date | None = None,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerSalesSummaryOut:
    return service.get_sales_summary(db, auth, from_dt, to_dt)


@router.get("/low-stock", response_model=SellerLowStockSummaryOut)
def get_low_stock_summary(
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerLowStockSummaryOut:
    return service.get_low_stock_summary(db, auth)


@router.get("/refunds", response_model=SellerRefundSummaryOut)
def get_refund_summary(
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerRefundSummaryOut:
    return service.get_refund_summary(db, auth)
