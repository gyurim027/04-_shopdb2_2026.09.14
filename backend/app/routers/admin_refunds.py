"""Router for Admin Refunds domain (refund_policies, refund_requests, refund_items)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import AuthContext, require_admin
from app.schemas.admin_refunds import (
    RefundApprove,
    RefundItemOut,
    RefundPolicyCreate,
    RefundPolicyOut,
    RefundPolicyUpdate,
    RefundRequestOut,
)
from app.services import admin_refunds as service

router = APIRouter(prefix="/admin/refunds", tags=["Admin Refunds"])


@router.get("/policies", response_model=list[RefundPolicyOut])
def list_refund_policies(
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> list[RefundPolicyOut]:
    return service.list_refund_policies(db, auth)


@router.get("/policies/{refund_policy_id}", response_model=RefundPolicyOut)
def get_refund_policy(
    refund_policy_id: int,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> RefundPolicyOut:
    return service.get_refund_policy(db, refund_policy_id, auth)


@router.post("/policies", response_model=RefundPolicyOut, status_code=201)
def create_refund_policy(
    payload: RefundPolicyCreate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> RefundPolicyOut:
    return service.create_refund_policy(db, payload.model_dump(), auth)


@router.patch("/policies/{refund_policy_id}", response_model=RefundPolicyOut)
def update_refund_policy(
    refund_policy_id: int,
    payload: RefundPolicyUpdate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> RefundPolicyOut:
    return service.update_refund_policy(
        db, refund_policy_id, payload.model_dump(exclude_unset=True), auth
    )


@router.delete("/policies/{refund_policy_id}", status_code=204)
def deactivate_refund_policy(
    refund_policy_id: int,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> None:
    service.deactivate_refund_policy(db, refund_policy_id, auth)


@router.get("/requests", response_model=list[RefundRequestOut])
def list_refund_requests(
    refund_status: str | None = None,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> list[RefundRequestOut]:
    return service.list_refund_requests(db, auth, refund_status=refund_status)


@router.get("/requests/{refund_request_id}", response_model=RefundRequestOut)
def get_refund_request(
    refund_request_id: int,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> RefundRequestOut:
    return service.get_refund_request(db, refund_request_id, auth)


@router.get(
    "/requests/{refund_request_id}/items", response_model=list[RefundItemOut]
)
def list_refund_items(
    refund_request_id: int,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> list[RefundItemOut]:
    return service.list_refund_items(db, refund_request_id, auth)


@router.patch("/requests/{refund_request_id}/approve", response_model=RefundRequestOut)
def approve_refund_request(
    refund_request_id: int,
    payload: RefundApprove,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> RefundRequestOut:
    return service.approve_refund_request(
        db, refund_request_id, payload.approved_amount, auth
    )


@router.patch("/requests/{refund_request_id}/reject", response_model=RefundRequestOut)
def reject_refund_request(
    refund_request_id: int,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> RefundRequestOut:
    return service.reject_refund_request(db, refund_request_id, auth)