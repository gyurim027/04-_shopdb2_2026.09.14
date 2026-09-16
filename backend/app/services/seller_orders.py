"""Service layer for seller_orders (S-ORD-01~05).

orders/order_items/payments는 명현님 소유 도메인(models/orders.py)인데, 현재 그 파일의
ORM 모델이 실제 shopdb2 컬럼명과 다르게 작성되어 있어(팀에 별도 공유 예정 이슈) 신뢰할 수
없다. 그래서 이 서비스는 admin_refunds.py가 이미 쓰고 있는 것과 동일하게 raw SQL(text())로
실제 컬럼명을 직접 사용해 조회한다. 여기서 참조하는 컬럼명은 backup/2026.09.14_backup.sql의
실제 CREATE TABLE 정의를 기준으로 확인했다.
"""

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.dependencies.auth import AuthContext
from app.schemas.seller_orders import ORDER_ITEM_STATUSES


def list_orders(db: Session, auth: AuthContext) -> list[dict]:
    rows = db.execute(
        text(
            """
            SELECT
                o.order_id,
                o.order_no,
                o.order_status,
                o.ordered_at,
                COUNT(oi.order_item_id) AS my_item_count,
                SUM(oi.item_amount) AS my_item_amount
            FROM orders o
            JOIN order_items oi ON oi.order_id = o.order_id
            JOIN products p ON p.product_id = oi.product_id
            WHERE p.seller_user_id = :seller_user_id
            GROUP BY o.order_id, o.order_no, o.order_status, o.ordered_at
            ORDER BY o.ordered_at DESC
            """
        ),
        {"seller_user_id": auth.user_id},
    ).all()
    return [
        {
            "order_id": row.order_id,
            "order_no": row.order_no,
            "order_status": row.order_status,
            "ordered_at": row.ordered_at,
            "my_item_count": int(row.my_item_count),
            "my_item_amount": row.my_item_amount,
        }
        for row in rows
    ]


def _assert_order_has_my_items(db: Session, order_id: int, auth: AuthContext) -> None:
    exists = db.execute(
        text(
            """
            SELECT 1
            FROM order_items oi
            JOIN products p ON p.product_id = oi.product_id
            WHERE oi.order_id = :order_id AND p.seller_user_id = :seller_user_id
            LIMIT 1
            """
        ),
        {"order_id": order_id, "seller_user_id": auth.user_id},
    ).first()
    if exists is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="주문을 찾을 수 없습니다."
        )


def get_order_detail(db: Session, order_id: int, auth: AuthContext) -> dict:
    _assert_order_has_my_items(db, order_id, auth)

    order_row = db.execute(
        text(
            """
            SELECT order_id, order_no, order_status, ordered_at, receiver_name, receiver_phone
            FROM orders
            WHERE order_id = :order_id
            """
        ),
        {"order_id": order_id},
    ).first()

    item_rows = db.execute(
        text(
            """
            SELECT
                oi.order_item_id, oi.product_id, oi.product_name_snapshot,
                oi.sku_snapshot, oi.quantity, oi.unit_price, oi.item_amount, oi.item_status
            FROM order_items oi
            JOIN products p ON p.product_id = oi.product_id
            WHERE oi.order_id = :order_id AND p.seller_user_id = :seller_user_id
            ORDER BY oi.order_item_id
            """
        ),
        {"order_id": order_id, "seller_user_id": auth.user_id},
    ).all()

    return {
        "order_id": order_row.order_id,
        "order_no": order_row.order_no,
        "order_status": order_row.order_status,
        "ordered_at": order_row.ordered_at,
        "receiver_name": order_row.receiver_name,
        "receiver_phone": order_row.receiver_phone,
        "items": [
            {
                "order_item_id": row.order_item_id,
                "product_id": row.product_id,
                "product_name_snapshot": row.product_name_snapshot,
                "sku_snapshot": row.sku_snapshot,
                "quantity": row.quantity,
                "unit_price": row.unit_price,
                "item_amount": row.item_amount,
                "item_status": row.item_status,
            }
            for row in item_rows
        ],
    }


def update_order_item_status(
    db: Session, order_item_id: int, item_status: str, auth: AuthContext
) -> dict:
    if item_status not in ORDER_ITEM_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"허용되지 않는 상태값입니다. 허용값: {ORDER_ITEM_STATUSES}",
        )

    owned = db.execute(
        text(
            """
            SELECT oi.order_item_id
            FROM order_items oi
            JOIN products p ON p.product_id = oi.product_id
            WHERE oi.order_item_id = :order_item_id AND p.seller_user_id = :seller_user_id
            """
        ),
        {"order_item_id": order_item_id, "seller_user_id": auth.user_id},
    ).first()
    if owned is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="주문 항목을 찾을 수 없습니다."
        )

    db.execute(
        text("UPDATE order_items SET item_status = :item_status WHERE order_item_id = :order_item_id"),
        {"item_status": item_status, "order_item_id": order_item_id},
    )
    db.commit()

    row = db.execute(
        text(
            """
            SELECT order_item_id, product_id, product_name_snapshot, sku_snapshot,
                   quantity, unit_price, item_amount, item_status
            FROM order_items WHERE order_item_id = :order_item_id
            """
        ),
        {"order_item_id": order_item_id},
    ).first()
    return {
        "order_item_id": row.order_item_id,
        "product_id": row.product_id,
        "product_name_snapshot": row.product_name_snapshot,
        "sku_snapshot": row.sku_snapshot,
        "quantity": row.quantity,
        "unit_price": row.unit_price,
        "item_amount": row.item_amount,
        "item_status": row.item_status,
    }


def get_payment(db: Session, order_id: int, auth: AuthContext) -> dict:
    _assert_order_has_my_items(db, order_id, auth)
    row = db.execute(
        text(
            """
            SELECT payment_status, payment_method, approved_at
            FROM payments
            WHERE order_id = :order_id
            LIMIT 1
            """
        ),
        {"order_id": order_id},
    ).first()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="결제 정보를 찾을 수 없습니다."
        )
    return {
        "payment_status": row.payment_status,
        "payment_method": row.payment_method,
        "approved_at": row.approved_at,
    }


def get_receipt(db: Session, order_id: int, auth: AuthContext) -> dict:
    _assert_order_has_my_items(db, order_id, auth)
    row = db.execute(
        text("SELECT receipt_url FROM payments WHERE order_id = :order_id LIMIT 1"),
        {"order_id": order_id},
    ).first()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="결제 정보를 찾을 수 없습니다."
        )
    return {"receipt_url": row.receipt_url}
