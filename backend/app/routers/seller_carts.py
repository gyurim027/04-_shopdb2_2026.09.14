"""Seller Cart Insights API router (S-CART-01~05).

라우터는 HTTP 주소와 응답 스키마를 정의하고,
실제 집계 SQL은 app.services.seller_carts에 위임한다.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import AuthContext, require_seller
from app.schemas.seller_carts import (
    SellerCartProductInsightOut,
    SellerCartSelectionStatusOut,
    SellerCartSkuInsightOut,
    SellerCartSummaryOut,
    SellerLongHeldCartItemOut,
)
from app.services import seller_carts as service


router = APIRouter(
    prefix="/seller/carts",
    tags=["Seller Cart Insights"],
)


@router.get(
    "/summary",
    response_model=SellerCartSummaryOut,
)
def get_cart_summary(
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerCartSummaryOut:
    """S-CART-01 현재 장바구니 관심 요약을 조회한다."""

    return service.get_cart_summary(
        db=db,
        auth=auth,
    )


@router.get(
    "/products",
    response_model=list[SellerCartProductInsightOut],
)
def list_product_insights(
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> list[SellerCartProductInsightOut]:
    """S-CART-02 상품별 현재 장바구니 관심 순위를 조회한다."""

    return service.list_product_insights(
        db=db,
        auth=auth,
    )


@router.get(
    "/skus",
    response_model=list[SellerCartSkuInsightOut],
)
def list_sku_insights(
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> list[SellerCartSkuInsightOut]:
    """S-CART-03 옵션별 현재 장바구니 관심과 재고를 조회한다."""

    return service.list_sku_insights(
        db=db,
        auth=auth,
    )


@router.get(
    "/selection-status",
    response_model=list[SellerCartSelectionStatusOut],
)
def list_selection_status_insights(
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> list[SellerCartSelectionStatusOut]:
    """S-CART-04 결제 선택 상태 Y/N별 현재 집계를 조회한다."""

    return service.list_selection_status_insights(
        db=db,
        auth=auth,
    )


@router.get(
    "/long-held",
    response_model=list[SellerLongHeldCartItemOut],
)
def list_long_held_cart_items(
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> list[SellerLongHeldCartItemOut]:
    """S-CART-05 추가 후 7일 이상 남은 현재 장바구니 상품을 조회한다."""

    return service.list_long_held_cart_items(
        db=db,
        auth=auth,
    )