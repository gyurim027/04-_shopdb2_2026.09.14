"""Router for seller inventory."""

from fastapi import (
    APIRouter,
    Depends,
)
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import (
    AuthContext,
    require_seller,
)
from app.schemas.seller_inventory import (
    SellerInventoryOut,
    SellerInventoryUpdate,
    SellerReservedInventoryOut,
)
from app.services import seller_inventory as service


router = APIRouter(
    prefix="/seller/inventory",
    tags=["Seller Inventory"],
)


@router.get(
    "",
    response_model=list[SellerInventoryOut],
)
def list_inventories(
    keyword: str | None = None,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> list[SellerInventoryOut]:
    """로그인한 셀러의 전체 재고를 조회한다."""

    return service.list_inventories(
        db,
        auth,
        keyword=keyword,
    )


@router.get(
    "/products/{product_id}",
    response_model=list[SellerInventoryOut],
)
def list_product_inventories(
    product_id: int,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> list[SellerInventoryOut]:
    """특정 상품의 SKU별 재고를 조회한다.

    상품 수정과 옵션 수정 화면에서 사용한다.
    """

    return service.list_product_inventories(
        db,
        product_id,
        auth,
    )


@router.get(
    "/low-stock",
    response_model=list[SellerInventoryOut],
)
def list_low_stock_inventories(
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> list[SellerInventoryOut]:
    """안전 재고 이하인 재고를 조회한다."""

    return service.list_low_stock_inventories(
        db,
        auth,
    )


@router.get(
    "/reserved",
    response_model=list[SellerReservedInventoryOut],
)
def list_reserved_inventories(
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> list[SellerReservedInventoryOut]:
    """SKU별 예약 재고를 조회한다."""

    return service.list_reserved_inventories(
        db,
        auth,
    )


@router.patch(
    "/{inventory_id}",
    response_model=SellerInventoryOut,
)
def update_inventory(
    inventory_id: int,
    payload: SellerInventoryUpdate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerInventoryOut:
    """현재 재고 또는 안전 재고를 수정한다."""

    return service.update_inventory(
        db,
        inventory_id,
        payload.model_dump(
            exclude_unset=True,
        ),
        auth,
    )