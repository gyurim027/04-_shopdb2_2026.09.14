from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session


def remove_paid_order_items_from_cart(
    db: Session,
    user_id: int,
    order_id: int,
) -> None:
    """
    결제 완료된 주문 상품을 장바구니에서 제거한다.

    조건:
    - 로그인한 고객 본인의 주문
    - 주문 상태가 PAID
    - 주문의 org_id와 같은 판매사
    - 주문에 포함된 variant_id
    - selected_yn = 'Y'

    다른 판매사의 상품과
    selected_yn = 'N' 상품은 그대로 유지한다.

    이미 삭제된 상태에서 다시 호출해도
    추가로 잘못 삭제되지 않는다.
    """

    order = db.execute(
        text(
            """
            SELECT
                order_id,
                buyer_user_id,
                org_id,
                order_status
            FROM orders
            WHERE order_id = :order_id
              AND buyer_user_id = :user_id
            """
        ),
        {
            "order_id": order_id,
            "user_id": user_id,
        },
    ).mappings().first()

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="주문을 찾을 수 없습니다.",
        )

    if order["order_status"] != "PAID":
        return

    cart = db.execute(
        text(
            """
            SELECT
                cart_id
            FROM carts
            WHERE buyer_user_id = :user_id
            """
        ),
        {
            "user_id": user_id,
        },
    ).mappings().first()

    if cart is None:
        return

    try:
        db.execute(
            text(
                """
                DELETE FROM cart_items
                WHERE cart_id = :cart_id
                  AND org_id = :org_id
                  AND selected_yn = 'Y'
                  AND variant_id IN (
                        SELECT variant_id
                        FROM order_items
                        WHERE order_id = :order_id
                          AND variant_id IS NOT NULL
                  )
                """
            ),
            {
                "cart_id": cart["cart_id"],
                "org_id": order["org_id"],
                "order_id": order_id,
            },
        )

        db.commit()

    except SQLAlchemyError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="결제 완료 후 장바구니 정리 중 데이터베이스 오류가 발생했습니다.",
        ) from exc