"""Service layer for seller inventory.

판매자는 다음 조건을 모두 만족하는 재고만 조회하고 수정할 수 있다.

1. 로그인한 판매자가 등록한 상품
2. 로그인한 판매자의 소속 조직에 등록된 재고
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies.auth import AuthContext
from app.models.products import (
    Inventory,
    Product,
    ProductVariant,
)


def _base_query(
    db: Session,
    auth: AuthContext,
):
    """로그인한 셀러가 관리할 수 있는 재고만 조회한다."""

    return (
        db.query(
            Inventory,
            ProductVariant,
            Product,
        )
        .join(
            ProductVariant,
            ProductVariant.variant_id
            == Inventory.variant_id,
        )
        .join(
            Product,
            Product.product_id
            == ProductVariant.product_id,
        )
        .filter(
            Product.seller_user_id == auth.user_id,
            Inventory.org_id == auth.org_id,
        )
    )


def _to_dict(
    inventory: Inventory,
    variant: ProductVariant,
    product: Product,
) -> dict:
    """DB 조회 결과를 재고 응답 형태로 변환한다."""

    return {
        "inventory_id": inventory.inventory_id,
        "product_id": product.product_id,
        "product_name": product.product_name,
        "variant_id": variant.variant_id,
        "sku_code": variant.sku_code,
        "stock_quantity": inventory.stock_quantity,
        "reserved_quantity": inventory.reserved_quantity,
        "safety_stock": inventory.safety_stock,
        "updated_at": inventory.updated_at,
    }


def list_inventories(
    db: Session,
    auth: AuthContext,
    keyword: str | None = None,
) -> list[dict]:
    """로그인한 셀러의 전체 재고 목록을 조회한다."""

    query = _base_query(
        db,
        auth,
    )

    if keyword:
        cleaned_keyword = keyword.strip()

        if cleaned_keyword:
            query = query.filter(
                (
                    Product.product_name.like(
                        f"%{cleaned_keyword}%"
                    )
                )
                | (
                    ProductVariant.sku_code.like(
                        f"%{cleaned_keyword}%"
                    )
                )
            )

    rows = (
        query
        .order_by(Inventory.inventory_id)
        .all()
    )

    return [
        _to_dict(
            inventory,
            variant,
            product,
        )
        for inventory, variant, product in rows
    ]


def list_product_inventories(
    db: Session,
    product_id: int,
    auth: AuthContext,
) -> list[dict]:
    """특정 상품에 등록된 SKU별 재고를 조회한다.

    상품 수정 또는 옵션 수정 화면에서 사용한다.
    재고 행이 없는 상품은 빈 목록을 반환하지만,
    다른 셀러의 상품에는 접근할 수 없다.
    """

    owned_product = (
        db.query(Product)
        .filter(
            Product.product_id == product_id,
            Product.seller_user_id == auth.user_id,
        )
        .first()
    )

    if owned_product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="상품을 찾을 수 없습니다.",
        )

    rows = (
        _base_query(
            db,
            auth,
        )
        .filter(
            Product.product_id == product_id,
        )
        .order_by(
            ProductVariant.variant_id,
            Inventory.inventory_id,
        )
        .all()
    )

    return [
        _to_dict(
            inventory,
            variant,
            product,
        )
        for inventory, variant, product in rows
    ]


def list_low_stock_inventories(
    db: Session,
    auth: AuthContext,
) -> list[dict]:
    """판매 가능 재고가 안전 재고 이하인 목록을 조회한다."""

    rows = (
        _base_query(
            db,
            auth,
        )
        .filter(
            (
                Inventory.stock_quantity
                - Inventory.reserved_quantity
            )
            <= Inventory.safety_stock
        )
        .order_by(Inventory.inventory_id)
        .all()
    )

    return [
        _to_dict(
            inventory,
            variant,
            product,
        )
        for inventory, variant, product in rows
    ]


def _get_owned_inventory_row(
    db: Session,
    inventory_id: int,
    auth: AuthContext,
) -> tuple[
    Inventory,
    ProductVariant,
    Product,
]:
    """셀러가 수정할 수 있는 재고 한 건을 조회한다."""

    row = (
        _base_query(
            db,
            auth,
        )
        .filter(
            Inventory.inventory_id == inventory_id,
        )
        .first()
    )

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="재고 정보를 찾을 수 없습니다.",
        )

    return row


def update_inventory(
    db: Session,
    inventory_id: int,
    data: dict,
    auth: AuthContext,
) -> dict:
    """현재 재고 또는 안전 재고를 수정한다.

    이미 주문에 예약된 수량보다 현재 재고를 작게 줄이는 것은
    주문 가능한 수량 계산을 깨뜨릴 수 있으므로 차단한다.
    """

    inventory, variant, product = (
        _get_owned_inventory_row(
            db,
            inventory_id,
            auth,
        )
    )

    new_stock_quantity = data.get(
        "stock_quantity"
    )

    if (
        new_stock_quantity is not None
        and new_stock_quantity
        < inventory.reserved_quantity
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "현재 재고는 예약 재고보다 작게 "
                "설정할 수 없습니다. "
                f"현재 예약 재고는 "
                f"{inventory.reserved_quantity}개입니다."
            ),
        )

    for key, value in data.items():
        if value is not None:
            setattr(
                inventory,
                key,
                value,
            )

    db.commit()
    db.refresh(inventory)

    return _to_dict(
        inventory,
        variant,
        product,
    )


def list_reserved_inventories(
    db: Session,
    auth: AuthContext,
) -> list[dict]:
    """SKU별 예약 재고를 조회한다."""

    rows = (
        _base_query(
            db,
            auth,
        )
        .order_by(Inventory.inventory_id)
        .all()
    )

    return [
        {
            "variant_id": variant.variant_id,
            "product_id": product.product_id,
            "product_name": product.product_name,
            "sku_code": variant.sku_code,
            "stock_quantity": inventory.stock_quantity,
            "reserved_quantity": (
                inventory.reserved_quantity
            ),
        }
        for inventory, variant, product in rows
    ]