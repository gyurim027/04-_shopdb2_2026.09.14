"""Service layer for seller_inventory (S-INV-01~04).

스코프 규칙(04_관리자권한매트릭스 §1 주1): 판매자의 소속 org는 users.org_id(=auth.org_id)로
판단한다. 재고는 이 org_id로 직접 스코프하고, 추가로 본인 상품의 옵션(variant)인지도 함께 확인한다.
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies.auth import AuthContext
from app.models.products import Inventory, Product, ProductVariant


def _base_query(db: Session, auth: AuthContext):
    return (
        db.query(Inventory, ProductVariant, Product)
        .join(ProductVariant, ProductVariant.variant_id == Inventory.variant_id)
        .join(Product, Product.product_id == ProductVariant.product_id)
        .filter(
            Product.seller_user_id == auth.user_id,
            Inventory.org_id == auth.org_id,
        )
    )


def _to_dict(inventory: Inventory, variant: ProductVariant, product: Product) -> dict:
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
    db: Session, auth: AuthContext, keyword: str | None = None
) -> list[dict]:
    query = _base_query(db, auth)
    if keyword:
        query = query.filter(
            (Product.product_name.like(f"%{keyword}%"))
            | (ProductVariant.sku_code.like(f"%{keyword}%"))
        )
    return [_to_dict(inv, var, prod) for inv, var, prod in query.order_by(Inventory.inventory_id).all()]


def list_low_stock_inventories(db: Session, auth: AuthContext) -> list[dict]:
    query = _base_query(db, auth).filter(
        (Inventory.stock_quantity - Inventory.reserved_quantity) <= Inventory.safety_stock
    )
    return [_to_dict(inv, var, prod) for inv, var, prod in query.order_by(Inventory.inventory_id).all()]


def _get_owned_inventory_row(
    db: Session, inventory_id: int, auth: AuthContext
) -> tuple[Inventory, ProductVariant, Product]:
    row = _base_query(db, auth).filter(Inventory.inventory_id == inventory_id).first()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="재고 정보를 찾을 수 없습니다."
        )
    return row


def update_inventory(
    db: Session, inventory_id: int, data: dict, auth: AuthContext
) -> dict:
    inventory, variant, product = _get_owned_inventory_row(db, inventory_id, auth)
    for key, value in data.items():
        if value is not None:
            setattr(inventory, key, value)
    db.commit()
    db.refresh(inventory)
    return _to_dict(inventory, variant, product)


def list_reserved_inventories(db: Session, auth: AuthContext) -> list[dict]:
    query = _base_query(db, auth)
    return [
        {
            "variant_id": var.variant_id,
            "product_id": prod.product_id,
            "product_name": prod.product_name,
            "sku_code": var.sku_code,
            "stock_quantity": inv.stock_quantity,
            "reserved_quantity": inv.reserved_quantity,
        }
        for inv, var, prod in query.order_by(Inventory.inventory_id).all()
    ]
