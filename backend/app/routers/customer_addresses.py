from fastapi import (
    APIRouter,
    Depends,
    Response,
    status,
)
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import (
    AuthContext,
    require_customer,
)
from app.schemas.customer_addresses import (
    CustomerAddressCreateRequest,
    CustomerAddressResponse,
    CustomerAddressUpdateRequest,
)
from app.services import customer_addresses as service


router = APIRouter(
    prefix="/customer/addresses",
    tags=["Customer Addresses"],
)


@router.get(
    "",
    response_model=list[CustomerAddressResponse],
)
def get_my_addresses(
    auth: AuthContext = Depends(require_customer),
    db: Session = Depends(get_db),
) -> list[CustomerAddressResponse]:
    """
    로그인한 고객의 배송지 목록 조회.

    JWT의 user_id를 사용하므로
    현재 로그인한 고객의 배송지만 조회한다.
    """

    return service.get_customer_addresses(
        db=db,
        user_id=auth.user_id,
    )


@router.post(
    "",
    response_model=CustomerAddressResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_my_address(
    address_in: CustomerAddressCreateRequest,
    auth: AuthContext = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CustomerAddressResponse:
    """
    로그인한 고객의 배송지 등록.

    - 첫 번째 배송지는 자동으로 기본 배송지
    - default_yn='Y'로 등록하면 기존 기본 배송지는 해제
    """

    return service.create_customer_address(
        db=db,
        user_id=auth.user_id,
        address_in=address_in,
    )


@router.patch(
    "/{address_id}",
    response_model=CustomerAddressResponse,
)
def update_my_address(
    address_id: int,
    address_in: CustomerAddressUpdateRequest,
    auth: AuthContext = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CustomerAddressResponse:
    """
    로그인한 고객의 배송지 수정.

    address_id와 JWT의 user_id를 함께 검사하므로
    본인의 배송지만 수정할 수 있다.
    """

    return service.update_customer_address(
        db=db,
        user_id=auth.user_id,
        address_id=address_id,
        address_in=address_in,
    )


@router.delete(
    "/{address_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_my_address(
    address_id: int,
    auth: AuthContext = Depends(require_customer),
    db: Session = Depends(get_db),
) -> Response:
    """
    로그인한 고객의 배송지 삭제.

    본인의 배송지만 삭제 가능하며,
    기본 배송지를 삭제한 경우 남은 배송지 중 하나를
    자동으로 기본 배송지로 지정한다.
    """

    service.delete_customer_address(
        db=db,
        user_id=auth.user_id,
        address_id=address_id,
    )

    return Response(
        status_code=status.HTTP_204_NO_CONTENT,
    )