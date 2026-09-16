from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import AuthContext, require_customer
from app.schemas.customer_refunds import (
    CustomerRefundCreateRequest,
    CustomerRefundListResponse,
    CustomerRefundPolicyResponse,
    CustomerRefundResponse,
    CustomerRefundStatusResponse,
)
from app.services import customer_refunds as service


router = APIRouter(
    prefix="/customer/refunds",
    tags=["Customer Refunds"],
)


@router.get(
    "/policy",
    response_model=CustomerRefundPolicyResponse,
)
def get_refund_policy(
    order_id: int = Query(
        ge=1,
        description="환불 정책을 확인할 주문 ID",
    ),
    auth: AuthContext = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CustomerRefundPolicyResponse:
    """
    특정 주문에 현재 적용되는 환불 정책을 조회한다.
    """

    return service.get_customer_refund_policy(
        db=db,
        user_id=auth.user_id,
        order_id=order_id,
    )


@router.post(
    "",
    response_model=CustomerRefundResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_refund(
    refund_in: CustomerRefundCreateRequest,
    auth: AuthContext = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CustomerRefundResponse:
    """
    고객이 자신의 주문에 대해 환불을 요청한다.
    """

    return service.create_customer_refund(
        db=db,
        user_id=auth.user_id,
        refund_in=refund_in,
    )


@router.get(
    "",
    response_model=CustomerRefundListResponse,
)
def get_refunds(
    page: int = Query(
        default=1,
        ge=1,
        description="페이지 번호",
    ),
    size: int = Query(
        default=20,
        ge=1,
        le=100,
        description="페이지당 조회 개수",
    ),
    auth: AuthContext = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CustomerRefundListResponse:
    """
    로그인한 고객 본인의 환불 요청 목록을 조회한다.
    """

    return service.get_customer_refunds(
        db=db,
        user_id=auth.user_id,
        page=page,
        size=size,
    )


@router.get(
    "/{refund_request_id}/status",
    response_model=CustomerRefundStatusResponse,
)
def get_refund_status(
    refund_request_id: int,
    auth: AuthContext = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CustomerRefundStatusResponse:
    """
    특정 환불 요청의 현재 처리 상태를 조회한다.
    """

    return service.get_customer_refund_status(
        db=db,
        user_id=auth.user_id,
        refund_request_id=refund_request_id,
    )


@router.get(
    "/{refund_request_id}",
    response_model=CustomerRefundResponse,
)
def get_refund_detail(
    refund_request_id: int,
    auth: AuthContext = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CustomerRefundResponse:
    """
    특정 환불 요청의 상세 내용을 조회한다.
    """

    return service.get_customer_refund_detail(
        db=db,
        user_id=auth.user_id,
        refund_request_id=refund_request_id,
    )