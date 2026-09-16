"""Service layer for seller_refunds (S-REF-01~02, 조회 전용).

S-REF-03(승인/거절)은 04_관리자권한매트릭스 §3.4상 어드민 전용 업무라 이번 범위에서 제외했다.
refund_requests/refund_items는 규림님 소유(models/refunds.py)라 ORM을 쓰지만, 소유권 판별에
필요한 order_items/products 조인은 다른 담당자 소유 테이블이라 raw SQL로 처리한다.
"""

from fastapi import HTTPException, status
from sqlalchemy import bindparam, text
from sqlalchemy.orm import Session

from app.dependencies.auth import AuthContext
from app.models.refunds import RefundItem, RefundRequest


def _my_refund_request_ids(db: Session, auth: AuthContext) -> list[int]:
    rows = db.execute(
        text(
            """
            SELECT DISTINCT ri.refund_request_id
            FROM refund_items ri
            JOIN order_items oi ON oi.order_item_id = ri.order_item_id
            JOIN products p ON p.product_id = oi.product_id
            WHERE p.seller_user_id = :seller_user_id
            """
        ),
        {"seller_user_id": auth.user_id},
    ).all()
    return [row[0] for row in rows]


def list_refund_requests(
    db: Session, auth: AuthContext, refund_status: str | None = None
) -> list[RefundRequest]:
    ids = _my_refund_request_ids(db, auth)
    if not ids:
        return []
    query = db.query(RefundRequest).filter(RefundRequest.refund_request_id.in_(ids))
    if refund_status is not None:
        query = query.filter(RefundRequest.refund_status == refund_status)
    return list(query.order_by(RefundRequest.requested_at.desc()).all())


def _assert_owns_refund_request(db: Session, refund_request_id: int, auth: AuthContext) -> None:
    exists = db.execute(
        text(
            """
            SELECT 1
            FROM refund_items ri
            JOIN order_items oi ON oi.order_item_id = ri.order_item_id
            JOIN products p ON p.product_id = oi.product_id
            WHERE ri.refund_request_id = :refund_request_id AND p.seller_user_id = :seller_user_id
            LIMIT 1
            """
        ),
        {"refund_request_id": refund_request_id, "seller_user_id": auth.user_id},
    ).first()
    if exists is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="환불 요청을 찾을 수 없습니다."
        )


def get_refund_detail(db: Session, refund_request_id: int, auth: AuthContext) -> dict:
    _assert_owns_refund_request(db, refund_request_id, auth)

    refund_request = db.get(RefundRequest, refund_request_id)
    if refund_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="환불 요청을 찾을 수 없습니다."
        )

    # 내 상품이 포함된 환불 항목만 노출 (멀티셀러 주문 대비)
    item_rows = db.execute(
        text(
            """
            SELECT ri.refund_item_id, ri.order_item_id, ri.refund_quantity, ri.refund_amount,
                   oi.product_name_snapshot
            FROM refund_items ri
            JOIN order_items oi ON oi.order_item_id = ri.order_item_id
            JOIN products p ON p.product_id = oi.product_id
            WHERE ri.refund_request_id = :refund_request_id AND p.seller_user_id = :seller_user_id
            ORDER BY ri.refund_item_id
            """
        ),
        {"refund_request_id": refund_request_id, "seller_user_id": auth.user_id},
    ).all()

    return {
        "refund_request_id": refund_request.refund_request_id,
        "order_id": refund_request.order_id,
        "refund_reason": refund_request.refund_reason,
        "requested_amount": refund_request.requested_amount,
        "approved_amount": refund_request.approved_amount,
        "refund_status": refund_request.refund_status,
        "requested_at": refund_request.requested_at,
        "items": [
            {
                "refund_item_id": row.refund_item_id,
                "order_item_id": row.order_item_id,
                "product_name_snapshot": row.product_name_snapshot,
                "refund_quantity": row.refund_quantity,
                "refund_amount": row.refund_amount,
            }
            for row in item_rows
        ],
    }
