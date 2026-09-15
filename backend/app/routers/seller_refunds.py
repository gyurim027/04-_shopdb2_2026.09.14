"""Router for Seller Refunds domain (S-REF-01~02, 조회 전용)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import AuthContext, require_seller
from app.schemas.seller_refunds import SellerRefundDetailOut, SellerRefundRequestOut
from app.services import seller_refunds as service

router = APIRouter(prefix="/seller/refunds", tags=["Seller Refunds"])


@router.get("/requests", response_model=list[SellerRefundRequestOut])
def list_refund_requests(
    refund_status: str | None = None,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> list[SellerRefundRequestOut]:
    return service.list_refund_requests(db, auth, refund_status=refund_status)


@router.get("/requests/{refund_request_id}", response_model=SellerRefundDetailOut)
def get_refund_detail(
    refund_request_id: int,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerRefundDetailOut:
    return service.get_refund_detail(db, refund_request_id, auth)
