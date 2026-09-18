from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import AuthContext, require_customer
from app.schemas.customer_returns import (
    CustomerReturnCreateRequest,
    CustomerReturnListResponse,
    CustomerReturnResponse,
    CustomerReturnStatusResponse,
)
from app.services import customer_returns as service


router = APIRouter(
    prefix="/customer/returns",
    tags=["Customer Returns"],
)


@router.post(
    "",
    response_model=CustomerReturnResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_return(
    return_in: CustomerReturnCreateRequest,
    auth: AuthContext = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CustomerReturnResponse:
    """
    로그인한 고객이 본인의 주문에 대해 반품을 신청한다.
    """

    return service.create_customer_return(
        db=db,
        user_id=auth.user_id,
        return_in=return_in,
    )


@router.get(
    "",
    response_model=CustomerReturnListResponse,
)
def get_returns(
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
) -> CustomerReturnListResponse:
    """
    로그인한 고객 본인의 반품 요청 목록을 조회한다.
    """

    return service.get_customer_returns(
        db=db,
        user_id=auth.user_id,
        page=page,
        size=size,
    )


@router.get(
    "/{return_request_id}/status",
    response_model=CustomerReturnStatusResponse,
)
def get_return_status(
    return_request_id: int,
    auth: AuthContext = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CustomerReturnStatusResponse:
    """
    특정 반품 요청의 현재 처리 상태를 조회한다.
    """

    return service.get_customer_return_status(
        db=db,
        user_id=auth.user_id,
        return_request_id=return_request_id,
    )


@router.get(
    "/{return_request_id}",
    response_model=CustomerReturnResponse,
)
def get_return_detail(
    return_request_id: int,
    auth: AuthContext = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CustomerReturnResponse:
    """
    특정 반품 요청의 상세 내용을 조회한다.
    """

    return service.get_customer_return_detail(
        db=db,
        user_id=auth.user_id,
        return_request_id=return_request_id,
    )