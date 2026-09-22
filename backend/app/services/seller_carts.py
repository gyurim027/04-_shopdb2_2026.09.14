"""Service layer for seller cart insights (S-CART-01~05).

이 서비스는 carts/cart_items의 현재 스냅샷만 집계한다.
결제 완료 또는 고객 삭제로 cart_items에서 사라진 상품은 집계할 수 없으므로
장바구니 추가 횟수, 이탈률, 전환율로 해석하지 않는다.

판매자 범위는 두 조건을 동시에 검사한다.

1. cart_items.org_id = 로그인 판매자의 org_id
2. products.seller_user_id = 로그인 판매자의 user_id

구매자 식별정보는 응답하지 않고 COUNT 집계에만 사용한다.
"""

from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.dependencies.auth import AuthContext


def _require_org_id(auth: AuthContext) -> int:
    """장바구니 데이터를 조직별로 제한하기 위해 판매자의 org_id를 확인한다."""

    if auth.org_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="소속 조직이 있는 판매자만 장바구니 인사이트를 조회할 수 있습니다.",
        )

    return auth.org_id


def _to_decimal(value) -> Decimal:
    """DB의 NULL 또는 숫자 결과를 응답용 Decimal로 변환한다."""

    if value is None:
        return Decimal("0.00")

    return Decimal(str(value))


def get_cart_summary(
    db: Session,
    auth: AuthContext,
) -> dict:
    """현재 장바구니에 남아 있는 내 상품의 핵심 집계값을 반환한다."""

    org_id = _require_org_id(auth)

    row = db.execute(
        text(
            """
            SELECT
                COUNT(DISTINCT ci.cart_id) AS cart_count,
                COUNT(DISTINCT c.buyer_user_id) AS buyer_count,
                COALESCE(SUM(ci.quantity), 0) AS total_quantity,
                COALESCE(
                    SUM(
                        ci.quantity
                        * (
                            p.sale_price
                            + COALESCE(pv.additional_price, 0)
                        )
                    ),
                    0
                ) AS estimated_amount

            FROM cart_items AS ci

            INNER JOIN carts AS c
                ON c.cart_id = ci.cart_id

            INNER JOIN product_variants AS pv
                ON pv.variant_id = ci.variant_id

            INNER JOIN products AS p
                ON p.product_id = pv.product_id

            WHERE ci.org_id = :org_id
              AND p.seller_user_id = :seller_user_id
            """
        ),
        {
            "org_id": org_id,
            "seller_user_id": auth.user_id,
        },
    ).mappings().one()

    return {
        "cart_count": int(row["cart_count"] or 0),
        "buyer_count": int(row["buyer_count"] or 0),
        "total_quantity": int(row["total_quantity"] or 0),
        "estimated_amount": _to_decimal(row["estimated_amount"]),
    }


def list_product_insights(
    db: Session,
    auth: AuthContext,
) -> list[dict]:
    """상품별 현재 장바구니 수·수량·추정 금액을 내림차순으로 반환한다."""

    org_id = _require_org_id(auth)

    rows = db.execute(
        text(
            """
            SELECT
                p.product_id,
                p.product_code,
                p.product_name,
                p.product_status,
                COUNT(DISTINCT ci.cart_id) AS cart_count,
                COALESCE(SUM(ci.quantity), 0) AS total_quantity,
                COALESCE(
                    SUM(
                        ci.quantity
                        * (
                            p.sale_price
                            + COALESCE(pv.additional_price, 0)
                        )
                    ),
                    0
                ) AS estimated_amount

            FROM cart_items AS ci

            INNER JOIN product_variants AS pv
                ON pv.variant_id = ci.variant_id

            INNER JOIN products AS p
                ON p.product_id = pv.product_id

            WHERE ci.org_id = :org_id
              AND p.seller_user_id = :seller_user_id

            GROUP BY
                p.product_id,
                p.product_code,
                p.product_name,
                p.product_status

            ORDER BY
                cart_count DESC,
                total_quantity DESC,
                p.product_id
            """
        ),
        {
            "org_id": org_id,
            "seller_user_id": auth.user_id,
        },
    ).mappings().all()

    return [
        {
            "product_id": int(row["product_id"]),
            "product_code": row["product_code"],
            "product_name": row["product_name"],
            "product_status": row["product_status"],
            "cart_count": int(row["cart_count"] or 0),
            "total_quantity": int(row["total_quantity"] or 0),
            "estimated_amount": _to_decimal(row["estimated_amount"]),
        }
        for row in rows
    ]


def list_sku_insights(
    db: Session,
    auth: AuthContext,
) -> list[dict]:
    """옵션별 현재 장바구니 관심과 판매 가능 재고를 함께 반환한다."""

    org_id = _require_org_id(auth)

    rows = db.execute(
        text(
            """
            SELECT
                p.product_id,
                p.product_name,
                pv.variant_id,
                pv.sku_code,
                pv.option_name1,
                pv.option_value1,
                pv.option_name2,
                pv.option_value2,
                pv.active_yn AS variant_active_yn,
                COUNT(DISTINCT ci.cart_id) AS cart_count,
                COALESCE(SUM(ci.quantity), 0) AS total_quantity,
                COALESCE(i.stock_quantity, 0) AS stock_quantity,
                COALESCE(i.reserved_quantity, 0) AS reserved_quantity,
                GREATEST(
                    COALESCE(i.stock_quantity, 0)
                    - COALESCE(i.reserved_quantity, 0),
                    0
                ) AS available_quantity

            FROM cart_items AS ci

            INNER JOIN product_variants AS pv
                ON pv.variant_id = ci.variant_id

            INNER JOIN products AS p
                ON p.product_id = pv.product_id

            LEFT JOIN inventories AS i
                ON i.org_id = ci.org_id
               AND i.variant_id = ci.variant_id

            WHERE ci.org_id = :org_id
              AND p.seller_user_id = :seller_user_id

            GROUP BY
                p.product_id,
                p.product_name,
                pv.variant_id,
                pv.sku_code,
                pv.option_name1,
                pv.option_value1,
                pv.option_name2,
                pv.option_value2,
                pv.active_yn,
                i.stock_quantity,
                i.reserved_quantity

            ORDER BY
                total_quantity DESC,
                cart_count DESC,
                pv.variant_id
            """
        ),
        {
            "org_id": org_id,
            "seller_user_id": auth.user_id,
        },
    ).mappings().all()

    return [
        {
            "product_id": int(row["product_id"]),
            "product_name": row["product_name"],
            "variant_id": int(row["variant_id"]),
            "sku_code": row["sku_code"],
            "option_name1": row["option_name1"],
            "option_value1": row["option_value1"],
            "option_name2": row["option_name2"],
            "option_value2": row["option_value2"],
            "variant_active_yn": row["variant_active_yn"],
            "cart_count": int(row["cart_count"] or 0),
            "total_quantity": int(row["total_quantity"] or 0),
            "stock_quantity": int(row["stock_quantity"] or 0),
            "reserved_quantity": int(row["reserved_quantity"] or 0),
            "available_quantity": int(row["available_quantity"] or 0),
        }
        for row in rows
    ]


def list_selection_status_insights(
    db: Session,
    auth: AuthContext,
) -> list[dict]:
    """selected_yn Y/N별 현재 장바구니 수·수량·추정 금액을 반환한다."""

    org_id = _require_org_id(auth)

    rows = db.execute(
        text(
            """
            SELECT
                ci.selected_yn,
                COUNT(DISTINCT ci.cart_id) AS cart_count,
                COALESCE(SUM(ci.quantity), 0) AS total_quantity,
                COALESCE(
                    SUM(
                        ci.quantity
                        * (
                            p.sale_price
                            + COALESCE(pv.additional_price, 0)
                        )
                    ),
                    0
                ) AS estimated_amount

            FROM cart_items AS ci

            INNER JOIN product_variants AS pv
                ON pv.variant_id = ci.variant_id

            INNER JOIN products AS p
                ON p.product_id = pv.product_id

            WHERE ci.org_id = :org_id
              AND p.seller_user_id = :seller_user_id

            GROUP BY ci.selected_yn
            """
        ),
        {
            "org_id": org_id,
            "seller_user_id": auth.user_id,
        },
    ).mappings().all()

    result = {
        "Y": {
            "selected_yn": "Y",
            "cart_count": 0,
            "total_quantity": 0,
            "estimated_amount": Decimal("0.00"),
        },
        "N": {
            "selected_yn": "N",
            "cart_count": 0,
            "total_quantity": 0,
            "estimated_amount": Decimal("0.00"),
        },
    }

    for row in rows:
        selected_yn = row["selected_yn"]

        if selected_yn not in result:
            continue

        result[selected_yn] = {
            "selected_yn": selected_yn,
            "cart_count": int(row["cart_count"] or 0),
            "total_quantity": int(row["total_quantity"] or 0),
            "estimated_amount": _to_decimal(row["estimated_amount"]),
        }

    return [result["Y"], result["N"]]


def list_long_held_cart_items(
    db: Session,
    auth: AuthContext,
) -> list[dict]:
    """추가 후 7일 이상 남아 있는 현재 장바구니 상품을 구간·SKU별 집계한다."""

    org_id = _require_org_id(auth)

    rows = db.execute(
        text(
            """
            SELECT
                CASE
                    WHEN DATEDIFF(NOW(), ci.added_at) >= 30
                        THEN '30일 이상'
                    ELSE '7~29일'
                END AS hold_period,
                p.product_id,
                p.product_name,
                pv.variant_id,
                pv.sku_code,
                pv.option_name1,
                pv.option_value1,
                pv.option_name2,
                pv.option_value2,
                COUNT(DISTINCT ci.cart_id) AS cart_count,
                COALESCE(SUM(ci.quantity), 0) AS total_quantity,
                COALESCE(
                    SUM(
                        ci.quantity
                        * (
                            p.sale_price
                            + COALESCE(pv.additional_price, 0)
                        )
                    ),
                    0
                ) AS estimated_amount

            FROM cart_items AS ci

            INNER JOIN product_variants AS pv
                ON pv.variant_id = ci.variant_id

            INNER JOIN products AS p
                ON p.product_id = pv.product_id

            WHERE ci.org_id = :org_id
              AND p.seller_user_id = :seller_user_id
              AND ci.added_at <= DATE_SUB(NOW(), INTERVAL 7 DAY)

            GROUP BY
                hold_period,
                p.product_id,
                p.product_name,
                pv.variant_id,
                pv.sku_code,
                pv.option_name1,
                pv.option_value1,
                pv.option_name2,
                pv.option_value2

            ORDER BY
                CASE hold_period
                    WHEN '30일 이상' THEN 1
                    ELSE 2
                END,
                estimated_amount DESC,
                pv.variant_id
            """
        ),
        {
            "org_id": org_id,
            "seller_user_id": auth.user_id,
        },
    ).mappings().all()

    return [
        {
            "hold_period": row["hold_period"],
            "product_id": int(row["product_id"]),
            "product_name": row["product_name"],
            "variant_id": int(row["variant_id"]),
            "sku_code": row["sku_code"],
            "option_name1": row["option_name1"],
            "option_value1": row["option_value1"],
            "option_name2": row["option_name2"],
            "option_value2": row["option_value2"],
            "cart_count": int(row["cart_count"] or 0),
            "total_quantity": int(row["total_quantity"] or 0),
            "estimated_amount": _to_decimal(row["estimated_amount"]),
        }
        for row in rows
    ]