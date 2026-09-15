"""Router for Seller Orders domain (S-ORD-01~05)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import AuthContext, require_seller
from app.schemas.seller_orders import (
    SellerOrderDetailOut,
    SellerOrderItemOut,
    SellerOrderItemStatusUpdate,
    SellerOrderSummaryOut,
    SellerPaymentOut,
    SellerReceiptOut,
)
from app.services import seller_orders as service

router = APIRouter(prefix="/seller/orders", tags=["Seller Orders"])


@router.get("", response_model=list[SellerOrderSummaryOut])
def list_orders(
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> list[SellerOrderSummaryOut]:
    return service.list_orders(db, auth)


@router.get("/{order_id}", response_model=SellerOrderDetailOut)
def get_order_detail(
    order_id: int,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerOrderDetailOut:
    return service.get_order_detail(db, order_id, auth)


@router.patch("/items/{order_item_id}/status", response_model=SellerOrderItemOut)
def update_order_item_status(
    order_item_id: int,
    payload: SellerOrderItemStatusUpdate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerOrderItemOut:
    return service.update_order_item_status(db, order_item_id, payload.item_status, auth)


@router.get("/{order_id}/payment", response_model=SellerPaymentOut)
def get_payment(
    order_id: int,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerPaymentOut:
    return service.get_payment(db, order_id, auth)


@router.get("/{order_id}/receipt", response_model=SellerReceiptOut)
def get_receipt(
    order_id: int,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerReceiptOut:
    return service.get_receipt(db, order_id, auth)
