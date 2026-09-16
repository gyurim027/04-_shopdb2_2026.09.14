"""Service layer for seller_dashboard (S-DASH-01~05).

products/inventories는 규림님 소유(models/products.py)라 ORM을 쓰고, orders/order_items/
refund_requests/refund_items는 다른 담당자 소유 도메인이라 raw SQL로 실제 컬럼명을 사용한다
(seller_orders.py, seller_refunds.py와 동일한 이유).
"""

from datetime import date

from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.dependencies.auth import AuthContext
from app.models.products import Inventory, Product, ProductVariant


def get_product_status_summary(db: Session, auth: AuthContext) -> list[dict]:
    rows = (
        db.query(Product.product_status, func.count(Product.product_id))
        .filter(Product.seller_user_id == auth.user_id)
        .group_by(Product.product_status)
        .all()
    )
    return [{"product_status": status, "count": count} for status, count in rows]


def get_order_summary(
    db: Session, auth: AuthContext, from_dt: date | None, to_dt: date | None
) -> dict:
    row = db.execute(
        text(
            """
            SELECT
                COUNT(DISTINCT o.order_id) AS order_count,
                COALESCE(SUM(oi.quantity), 0) AS item_quantity
            FROM orders o
            JOIN order_items oi ON oi.order_id = o.order_id
            JOIN products p ON p.product_id = oi.product_id
            WHERE p.seller_user_id = :seller_user_id
                AND (:from_dt IS NULL OR o.ordered_at >= :from_dt)
                AND (:to_dt IS NULL OR o.ordered_at < :to_dt + INTERVAL 1 DAY)
            """
        ),
        {"seller_user_id": auth.user_id, "from_dt": from_dt, "to_dt": to_dt},
    ).first()
    return {
        "order_count": int(row.order_count),
        "item_quantity": int(row.item_quantity),
    }


def get_sales_summary(
    db: Session, auth: AuthContext, from_dt: date | None, to_dt: date | None
) -> dict:
    row = db.execute(
        text(
            """
            SELECT COALESCE(SUM(oi.item_amount), 0) AS sales_amount
            FROM order_items oi
            JOIN products p ON p.product_id = oi.product_id
            JOIN orders o ON o.order_id = oi.order_id
            WHERE p.seller_user_id = :seller_user_id
                AND (:from_dt IS NULL OR o.ordered_at >= :from_dt)
                AND (:to_dt IS NULL OR o.ordered_at < :to_dt + INTERVAL 1 DAY)
            """
        ),
        {"seller_user_id": auth.user_id, "from_dt": from_dt, "to_dt": to_dt},
    ).first()
    return {"sales_amount": row.sales_amount}


def get_low_stock_summary(db: Session, auth: AuthContext) -> dict:
    count = (
        db.query(Inventory)
        .join(ProductVariant, ProductVariant.variant_id == Inventory.variant_id)
        .join(Product, Product.product_id == ProductVariant.product_id)
        .filter(
            Product.seller_user_id == auth.user_id,
            Inventory.org_id == auth.org_id,
            (Inventory.stock_quantity - Inventory.reserved_quantity) <= Inventory.safety_stock,
        )
        .count()
    )
    return {"low_stock_count": count}


def get_refund_summary(db: Session, auth: AuthContext) -> dict:
    row = db.execute(
        text(
            """
            SELECT
                COUNT(DISTINCT rr.refund_request_id) AS pending_refund_count,
                COALESCE(SUM(ri.refund_amount), 0) AS pending_refund_amount
            FROM refund_requests rr
            JOIN refund_items ri ON ri.refund_request_id = rr.refund_request_id
            JOIN order_items oi ON oi.order_item_id = ri.order_item_id
            JOIN products p ON p.product_id = oi.product_id
            WHERE p.seller_user_id = :seller_user_id
                AND rr.refund_status IN ('REQUESTED', 'REVIEWING')
            """
        ),
        {"seller_user_id": auth.user_id},
    ).first()
    return {
        "pending_refund_count": int(row.pending_refund_count),
        "pending_refund_amount": row.pending_refund_amount,
    }
