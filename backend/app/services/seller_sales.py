"""Service layer for seller_sales (S-SALES-01~04).

orders/order_items/payments/product_variants 조인은 raw SQL로 실제 컬럼명을 사용한다
(seller_orders.py와 동일한 이유 — models/orders.py의 ORM이 현재 신뢰할 수 없음).
payments.payment_status는 DB enum이 아니라 varchar이며, 실제 시드 데이터 기준 결제완료는
'DONE'이다.
"""

from datetime import date

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.dependencies.auth import AuthContext

PAID_STATUS = "DONE"


def list_daily_sales(
    db: Session,
    auth: AuthContext,
    from_dt: date | None = None,
    to_dt: date | None = None,
) -> list[dict]:
    rows = db.execute(
        text(
            """
            SELECT
                DATE(o.ordered_at) AS sale_date,
                COUNT(DISTINCT o.order_id) AS order_count,
                SUM(oi.item_amount) AS sales_amount
            FROM orders o
            JOIN order_items oi ON oi.order_id = o.order_id
            JOIN products p ON p.product_id = oi.product_id
            WHERE p.seller_user_id = :seller_user_id
                AND (:from_dt IS NULL OR o.ordered_at >= :from_dt)
                AND (:to_dt IS NULL OR o.ordered_at < :to_dt + INTERVAL 1 DAY)
            GROUP BY DATE(o.ordered_at)
            ORDER BY sale_date
            """
        ),
        {"seller_user_id": auth.user_id, "from_dt": from_dt, "to_dt": to_dt},
    ).all()
    return [
        {
            "sale_date": row.sale_date,
            "order_count": int(row.order_count),
            "sales_amount": row.sales_amount,
        }
        for row in rows
    ]


def list_product_sales(db: Session, auth: AuthContext) -> list[dict]:
    rows = db.execute(
        text(
            """
            SELECT
                p.product_id,
                p.product_name,
                COALESCE(SUM(oi.quantity), 0) AS sold_quantity,
                COALESCE(SUM(oi.item_amount), 0) AS sold_amount
            FROM products p
            LEFT JOIN order_items oi ON oi.product_id = p.product_id
            WHERE p.seller_user_id = :seller_user_id
            GROUP BY p.product_id, p.product_name
            ORDER BY sold_amount DESC
            """
        ),
        {"seller_user_id": auth.user_id},
    ).all()
    return [
        {
            "product_id": row.product_id,
            "product_name": row.product_name,
            "sold_quantity": int(row.sold_quantity),
            "sold_amount": row.sold_amount,
        }
        for row in rows
    ]


def list_sku_sales(db: Session, auth: AuthContext) -> list[dict]:
    rows = db.execute(
        text(
            """
            SELECT
                pv.variant_id,
                pv.sku_code,
                p.product_name,
                COALESCE(SUM(oi.quantity), 0) AS sold_quantity,
                COALESCE(SUM(oi.item_amount), 0) AS sold_amount
            FROM product_variants pv
            JOIN products p ON p.product_id = pv.product_id
            LEFT JOIN order_items oi ON oi.variant_id = pv.variant_id
            WHERE p.seller_user_id = :seller_user_id
            GROUP BY pv.variant_id, pv.sku_code, p.product_name
            ORDER BY sold_amount DESC
            """
        ),
        {"seller_user_id": auth.user_id},
    ).all()
    return [
        {
            "variant_id": row.variant_id,
            "sku_code": row.sku_code,
            "product_name": row.product_name,
            "sold_quantity": int(row.sold_quantity),
            "sold_amount": row.sold_amount,
        }
        for row in rows
    ]


def get_paid_sales_total(db: Session, auth: AuthContext) -> dict:
    row = db.execute(
        text(
            """
            SELECT COALESCE(SUM(oi.item_amount), 0) AS total_amount
            FROM payments pay
            JOIN orders o ON o.order_id = pay.order_id
            JOIN order_items oi ON oi.order_id = o.order_id
            JOIN products p ON p.product_id = oi.product_id
            WHERE p.seller_user_id = :seller_user_id AND pay.payment_status = :paid_status
            """
        ),
        {"seller_user_id": auth.user_id, "paid_status": PAID_STATUS},
    ).first()
    return {"total_amount": row.total_amount}
