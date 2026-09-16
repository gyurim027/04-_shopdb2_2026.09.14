"""Router for Seller Info domain (S-INFO-01~03 + S-SALES-05 정산계좌)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import AuthContext, require_seller
from app.schemas.seller_info import (
    SellerProfileOut,
    SellerProfileUpdate,
    SellerSettlementAccountOut,
    SellerSettlementAccountUpdate,
    SellerStatusOut,
)
from app.services import seller_info as service

router = APIRouter(prefix="/seller/info", tags=["Seller Info"])


@router.get("/profile", response_model=SellerProfileOut)
def get_profile(
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerProfileOut:
    return service.get_profile(db, auth)


@router.patch("/profile", response_model=SellerProfileOut)
def update_profile(
    payload: SellerProfileUpdate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerProfileOut:
    return service.update_profile(db, payload.model_dump(exclude_unset=True), auth)


@router.get("/status", response_model=SellerStatusOut)
def get_status(
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerStatusOut:
    return service.get_status(db, auth)


@router.get("/settlement-account", response_model=SellerSettlementAccountOut)
def get_settlement_account(
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerSettlementAccountOut:
    return service.get_settlement_account(db, auth)


@router.patch("/settlement-account", response_model=SellerSettlementAccountOut)
def update_settlement_account(
    payload: SellerSettlementAccountUpdate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerSettlementAccountOut:
    return service.update_settlement_account(db, payload.model_dump(), auth)
