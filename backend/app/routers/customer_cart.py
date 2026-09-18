from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import AuthContext, require_customer
from app.schemas.customer_cart import (
    CustomerCartItemAddRequest,
    CustomerCartItemQuantityUpdateRequest,
    CustomerCartItemSelectedUpdateRequest,
    CustomerCartResponse,
)
from app.services import customer_cart as service


router = APIRouter(
    prefix="/customer/cart",
    tags=["Customer Cart"],
)


@router.get(
    "",
    response_model=CustomerCartResponse,
)
def get_cart(
    auth: AuthContext = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CustomerCartResponse:
    """
    로그인한 고객의 현재 장바구니를 조회한다.
    """

    return service.get_customer_cart(
        db=db,
        user_id=auth.user_id,
    )


@router.post(
    "/items",
    response_model=CustomerCartResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_cart_item(
    item_in: CustomerCartItemAddRequest,
    auth: AuthContext = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CustomerCartResponse:
    """
    상품 옵션과 수량을 장바구니에 추가한다.

    같은 variant_id가 이미 존재하면
    기존 장바구니 상품의 수량을 증가시킨다.
    """

    return service.add_customer_cart_item(
        db=db,
        user_id=auth.user_id,
        item_in=item_in,
    )


@router.patch(
    "/items/{cart_item_id}",
    response_model=CustomerCartResponse,
)
def update_cart_item_quantity(
    cart_item_id: int,
    item_in: CustomerCartItemQuantityUpdateRequest,
    auth: AuthContext = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CustomerCartResponse:
    """
    장바구니 상품의 수량을 변경한다.
    """

    return service.update_customer_cart_item_quantity(
        db=db,
        user_id=auth.user_id,
        cart_item_id=cart_item_id,
        item_in=item_in,
    )


@router.patch(
    "/items/{cart_item_id}/selected",
    response_model=CustomerCartResponse,
)
def update_cart_item_selected(
    cart_item_id: int,
    item_in: CustomerCartItemSelectedUpdateRequest,
    auth: AuthContext = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CustomerCartResponse:
    """
    장바구니 상품의 주문 선택 여부를 변경한다.

    selected_yn:
    Y = 이번 주문에 포함
    N = 장바구니에는 유지하고 이번 주문에서는 제외
    """

    return service.update_customer_cart_item_selected(
        db=db,
        user_id=auth.user_id,
        cart_item_id=cart_item_id,
        item_in=item_in,
    )


@router.delete(
    "/items/{cart_item_id}",
    response_model=CustomerCartResponse,
)
def delete_cart_item(
    cart_item_id: int,
    auth: AuthContext = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CustomerCartResponse:
    """
    장바구니에서 상품 한 건을 삭제한다.
    """

    return service.delete_customer_cart_item(
        db=db,
        user_id=auth.user_id,
        cart_item_id=cart_item_id,
    )