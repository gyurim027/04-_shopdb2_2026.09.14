from fastapi import (
    APIRouter,
    Depends,
    Query,
    status,
)
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import (
    AuthContext,
    require_customer,
)
from app.schemas.customer_orders import (
    CustomerOrderCreateRequest,
    CustomerOrderDetailResponse,
    CustomerOrderListResponse,
    CustomerOrderStatusResponse,
)
from app.services import customer_orders as service


router = APIRouter(
    prefix="/customer/orders",
    tags=["Customer Orders"],
)


@router.post(
    "",
    response_model=CustomerOrderDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_order(
    order_in: CustomerOrderCreateRequest,
    auth: AuthContext = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CustomerOrderDetailResponse:
    """
    고객 주문 생성.

    장바구니 기능은 현재 사용하지 않는다.

    고객은:
    - 배송지
    - 상품
    - 상품 옵션
    - 수량

    만 전달한다.

    가격, 주문번호, 주문상태, org_id,
    buyer_user_id는 백엔드가 결정한다.
    """

    return service.create_customer_order(
        db=db,
        user_id=auth.user_id,
        order_in=order_in,
    )


@router.get(
    "",
    response_model=CustomerOrderListResponse,
)
def get_my_orders(
    page: int = Query(
        default=1,
        ge=1,
        description="페이지 번호",
    ),
    size: int = Query(
        default=20,
        ge=1,
        le=100,
        description="페이지당 주문 수",
    ),
    auth: AuthContext = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CustomerOrderListResponse:
    """
    로그인한 고객의 주문 목록 조회.

    JWT의 user_id를 기준으로
    본인의 주문만 조회한다.
    """

    return service.get_customer_orders(
        db=db,
        user_id=auth.user_id,
        page=page,
        size=size,
    )


@router.get(
    "/{order_id}",
    response_model=CustomerOrderDetailResponse,
)
def get_my_order_detail(
    order_id: int,
    auth: AuthContext = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CustomerOrderDetailResponse:
    """
    로그인한 고객의 주문 상세 조회.

    order_id와 현재 로그인한 user_id를
    함께 검사해서 본인 주문만 조회 가능하다.
    """

    return service.get_customer_order_detail(
        db=db,
        user_id=auth.user_id,
        order_id=order_id,
    )


@router.get(
    "/{order_id}/status",
    response_model=CustomerOrderStatusResponse,
)
def get_my_order_status(
    order_id: int,
    auth: AuthContext = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CustomerOrderStatusResponse:
    """
    로그인한 고객의 주문 상태 조회.

    주문 상세 전체가 아니라
    주문번호와 현재 상태만 간단히 반환한다.
    """

    return service.get_customer_order_status(
        db=db,
        user_id=auth.user_id,
        order_id=order_id,
    )