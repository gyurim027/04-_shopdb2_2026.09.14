from fastapi import (
    APIRouter,
    Depends,
    status,
)
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import (
    AuthContext,
    require_customer,
)
from app.schemas.customer_payments import (
    CustomerPaymentApproveRequest,
    CustomerPaymentRequestCreate,
    CustomerPaymentResponse,
    CustomerPaymentStatusResponse,
)
from app.services import customer_payments as service


router = APIRouter(
    prefix="/customer/payments",
    tags=["Customer Payments"],
)


@router.post(
    "/request",
    response_model=CustomerPaymentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_payment_request(
    payment_in: CustomerPaymentRequestCreate,
    auth: AuthContext = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CustomerPaymentResponse:
    """
    고객 결제 요청 생성.

    실제 결제 금액은 고객이 전달하지 않고
    주문의 total_amount를 백엔드가 조회해서 결정한다.
    """

    return service.create_customer_payment_request(
        db=db,
        user_id=auth.user_id,
        payment_in=payment_in,
    )


@router.post(
    "/{payment_id}/approve",
    response_model=CustomerPaymentResponse,
)
def approve_payment(
    payment_id: int,
    approve_in: CustomerPaymentApproveRequest,
    auth: AuthContext = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CustomerPaymentResponse:
    """
    고객 결제 승인.

    현재 단계에서는 실제 PG 서버 호출 대신
    PG 승인 결과를 전달받았다고 가정하고
    DB의 결제 승인 흐름을 처리한다.
    """

    return service.approve_customer_payment(
        db=db,
        user_id=auth.user_id,
        payment_id=payment_id,
        approve_in=approve_in,
    )


@router.get(
    "/{payment_id}",
    response_model=CustomerPaymentResponse,
)
def get_payment_detail(
    payment_id: int,
    auth: AuthContext = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CustomerPaymentResponse:
    """
    로그인한 고객 본인의 결제 상세 조회.
    """

    return service.get_customer_payment(
        db=db,
        user_id=auth.user_id,
        payment_id=payment_id,
    )


@router.get(
    "/{payment_id}/status",
    response_model=CustomerPaymentStatusResponse,
)
def get_payment_status(
    payment_id: int,
    auth: AuthContext = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CustomerPaymentStatusResponse:
    """
    고객 결제 상태 및 주문 상태 조회.
    """

    return service.get_customer_payment_status(
        db=db,
        user_id=auth.user_id,
        payment_id=payment_id,
    )