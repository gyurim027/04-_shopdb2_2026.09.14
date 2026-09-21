"""Router for Seller Dashboard domain.

판매자 대시보드에서 사용하는 상품, 주문, 매출,
재고, 환불, 반품 요약 API를 제공한다.
"""

from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import (
    AuthContext,
    require_seller,
)
from app.schemas.seller_dashboard import (
    SellerLowStockSummaryOut,
    SellerOrderSummaryOut,
    SellerProductStatusSummaryOut,
    SellerRefundSummaryOut,
    SellerReturnSummaryOut,  # 신규: 반품 요약 응답
    SellerSalesSummaryOut,
)
from app.services import seller_dashboard as service


# 아래 API의 공통 시작 주소는 /seller/dashboard다.
router = APIRouter(
    prefix="/seller/dashboard",
    tags=["Seller Dashboard"],
)


@router.get(
    "/product-status",
    response_model=list[SellerProductStatusSummaryOut],
)
def get_product_status_summary(
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> list[SellerProductStatusSummaryOut]:
    """판매 상태별 상품 개수를 조회한다."""

    return service.get_product_status_summary(
        db,
        auth,
    )


@router.get(
    "/orders",
    response_model=SellerOrderSummaryOut,
)
def get_order_summary(
    from_dt: date | None = None,
    to_dt: date | None = None,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerOrderSummaryOut:
    """기간별 주문 건수와 주문상품 수량을 조회한다."""

    return service.get_order_summary(
        db,
        auth,
        from_dt,
        to_dt,
    )


@router.get(
    "/sales",
    response_model=SellerSalesSummaryOut,
)
def get_sales_summary(
    from_dt: date | None = None,
    to_dt: date | None = None,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerSalesSummaryOut:
    """기간별 판매금액을 조회한다."""

    return service.get_sales_summary(
        db,
        auth,
        from_dt,
        to_dt,
    )


@router.get(
    "/low-stock",
    response_model=SellerLowStockSummaryOut,
)
def get_low_stock_summary(
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerLowStockSummaryOut:
    """안전재고 이하 상품 옵션 개수를 조회한다."""

    return service.get_low_stock_summary(
        db,
        auth,
    )


@router.get(
    "/refunds",
    response_model=SellerRefundSummaryOut,
)
def get_refund_summary(
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerRefundSummaryOut:
    """처리 대기 환불 건수와 금액을 조회한다."""

    return service.get_refund_summary(
        db,
        auth,
    )


# 신규: 기능정의서 S-RET-08
@router.get(
    "/returns",
    response_model=SellerReturnSummaryOut,
)
def get_return_summary(
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerReturnSummaryOut:
    """판매자가 처리해야 하는 반품 요청 건수를 조회한다."""

    return service.get_return_summary(
        db,
        auth,
    )