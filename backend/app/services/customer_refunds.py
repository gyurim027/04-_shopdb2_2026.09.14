from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.schemas.customer_refunds import (
    CustomerRefundCreateRequest,
    CustomerRefundItemResponse,
    CustomerRefundListItemResponse,
    CustomerRefundListResponse,
    CustomerRefundPolicyResponse,
    CustomerRefundResponse,
    CustomerRefundStatusResponse,
)


def _get_owned_order(
    db: Session,
    user_id: int,
    order_id: int,
):
    """
    로그인한 고객 본인의 주문을 조회한다.
    """

    order = db.execute(
        text(
            """
            SELECT
                order_id,
                order_no,
                buyer_user_id,
                org_id,
                order_status,
                total_amount
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

    return order


def _check_refundable_order(
    db: Session,
    user_id: int,
    order_id: int,
):
    """
    환불 신청 가능한 주문인지 확인한다.

    결제 완료된 주문만 환불 신청할 수 있도록 한다.
    """

    order = _get_owned_order(
        db=db,
        user_id=user_id,
        order_id=order_id,
    )

    refundable_statuses = {
        "PAID",
        "PREPARING",
        "SHIPPING",
        "DELIVERED",
        "COMPLETED",
    }

    if order["order_status"] not in refundable_statuses:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="현재 상태의 주문은 환불을 요청할 수 없습니다.",
        )

    completed_payment = db.execute(
        text(
            """
            SELECT payment_id
            FROM payments
            WHERE order_id = :order_id
              AND payment_status = 'DONE'
            ORDER BY payment_id DESC
            LIMIT 1
            """
        ),
        {
            "order_id": order_id,
        },
    ).scalar()

    if completed_payment is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="결제가 완료된 주문만 환불을 요청할 수 있습니다.",
        )

    return order


def _get_active_refund_policy(
    db: Session,
    org_id: int,
):
    """
    현재 주문 조직에 적용 가능한 환불 정책을 찾는다.

    우선순위:
    1. 주문 org_id와 정확히 일치하는 정책
    2. org_id가 NULL인 전사 공통 정책

    적용 가능한 정책이 없으면 None을 반환한다.
    DB에서 refund_policy_id는 nullable이므로
    환불 요청 자체는 계속 진행할 수 있다.
    """

    return db.execute(
        text(
            """
            SELECT
                refund_policy_id,
                org_id,
                policy_name,
                allowed_days,
                unopened_refund_yn,
                opened_refund_yn,
                defective_refund_yn,
                shipping_fee_payer,
                refund_policy_text,
                effective_from,
                effective_to,
                active_yn
            FROM refund_policies
            WHERE active_yn = 'Y'
              AND (
                    org_id = :org_id
                    OR org_id IS NULL
                  )
              AND effective_from <= CURRENT_DATE
              AND (
                    effective_to IS NULL
                    OR effective_to >= CURRENT_DATE
                  )
            ORDER BY
                CASE
                    WHEN org_id = :org_id THEN 0
                    ELSE 1
                END,
                effective_from DESC,
                refund_policy_id DESC
            LIMIT 1
            """
        ),
        {
            "org_id": org_id,
        },
    ).mappings().first()


def get_customer_refund_policy(
    db: Session,
    user_id: int,
    order_id: int,
) -> CustomerRefundPolicyResponse:
    """
    특정 주문에 현재 적용되는 환불 정책 조회.
    """

    order = _get_owned_order(
        db=db,
        user_id=user_id,
        order_id=order_id,
    )

    policy = _get_active_refund_policy(
        db=db,
        org_id=order["org_id"],
    )

    if policy is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="현재 적용 가능한 환불 정책이 없습니다.",
        )

    return CustomerRefundPolicyResponse(
        refund_policy_id=policy["refund_policy_id"],
        org_id=policy["org_id"],
        policy_name=policy["policy_name"],
        allowed_days=policy["allowed_days"],
        unopened_refund_yn=policy["unopened_refund_yn"],
        opened_refund_yn=policy["opened_refund_yn"],
        defective_refund_yn=policy["defective_refund_yn"],
        shipping_fee_payer=policy["shipping_fee_payer"],
        refund_policy_text=policy["refund_policy_text"],
        effective_from=policy["effective_from"],
        effective_to=policy["effective_to"],
        active_yn=policy["active_yn"],
    )


def _normalize_refund_items(
    refund_in: CustomerRefundCreateRequest,
) -> list[dict]:
    """
    같은 order_item_id가 여러 번 들어온 경우
    환불 수량을 하나로 합친다.
    """

    normalized: dict[int, dict] = {}

    for item in refund_in.items:
        if item.order_item_id not in normalized:
            normalized[item.order_item_id] = {
                "order_item_id": item.order_item_id,
                "refund_quantity": item.refund_quantity,
            }

        else:
            normalized[
                item.order_item_id
            ]["refund_quantity"] += item.refund_quantity

    return list(normalized.values())


def _get_refunded_quantity(
    db: Session,
    order_item_id: int,
) -> int:
    """
    이미 신청 중이거나 승인/완료된 환불 수량을 계산한다.

    REJECTED 요청은 다시 신청할 수 있도록 제외한다.
    """

    quantity = db.execute(
        text(
            """
            SELECT COALESCE(SUM(ri.refund_quantity), 0)

            FROM refund_items AS ri

            INNER JOIN refund_requests AS rr
                ON rr.refund_request_id =
                   ri.refund_request_id

            WHERE ri.order_item_id = :order_item_id
              AND rr.refund_status IN (
                    'REQUESTED',
                    'REVIEWING',
                    'APPROVED',
                    'COMPLETED'
                  )
            """
        ),
        {
            "order_item_id": order_item_id,
        },
    ).scalar_one()

    return int(quantity or 0)


def _prepare_refund_items(
    db: Session,
    order_id: int,
    refund_in: CustomerRefundCreateRequest,
) -> tuple[list[dict], Decimal]:
    """
    환불 상품을 검증하고 환불 요청 금액을 계산한다.
    """

    normalized_items = _normalize_refund_items(
        refund_in=refund_in,
    )

    prepared_items: list[dict] = []
    requested_amount = Decimal("0.00")

    for item in normalized_items:
        order_item = db.execute(
            text(
                """
                SELECT
                    order_item_id,
                    order_id,
                    product_id,
                    variant_id,
                    product_name_snapshot,
                    sku_snapshot,
                    quantity,
                    unit_price,
                    item_amount,
                    item_status

                FROM order_items

                WHERE order_item_id = :order_item_id
                  AND order_id = :order_id
                """
            ),
            {
                "order_item_id": item["order_item_id"],
                "order_id": order_id,
            },
        ).mappings().first()

        if order_item is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    "주문에 포함되지 않은 상품이 "
                    "환불 요청에 포함되어 있습니다."
                ),
            )

        already_refunded_quantity = (
            _get_refunded_quantity(
                db=db,
                order_item_id=order_item[
                    "order_item_id"
                ],
            )
        )

        remaining_quantity = (
            int(order_item["quantity"])
            - already_refunded_quantity
        )

        refund_quantity = int(
            item["refund_quantity"]
        )

        if refund_quantity > remaining_quantity:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"'{order_item['product_name_snapshot']}'의 "
                    "환불 가능 수량을 초과했습니다."
                ),
            )

        unit_price = Decimal(
            order_item["unit_price"]
        )

        refund_amount = (
            unit_price
            * refund_quantity
        )

        requested_amount += refund_amount

        prepared_items.append(
            {
                "order_item_id": order_item[
                    "order_item_id"
                ],
                "product_id": order_item[
                    "product_id"
                ],
                "variant_id": order_item[
                    "variant_id"
                ],
                "product_name_snapshot": order_item[
                    "product_name_snapshot"
                ],
                "sku_snapshot": order_item[
                    "sku_snapshot"
                ],
                "ordered_quantity": order_item[
                    "quantity"
                ],
                "refund_quantity": refund_quantity,
                "unit_price": unit_price,
                "refund_amount": refund_amount,
            }
        )

    return (
        prepared_items,
        requested_amount,
    )


def create_customer_refund(
    db: Session,
    user_id: int,
    refund_in: CustomerRefundCreateRequest,
) -> CustomerRefundResponse:
    """
    고객 환불 요청 생성.

    새 요청은 REQUESTED 상태로 저장되며,
    이후 기존 admin_refunds 기능에서
    관리자가 승인 또는 거절한다.
    """

    order = _check_refundable_order(
        db=db,
        user_id=user_id,
        order_id=refund_in.order_id,
    )

    policy = _get_active_refund_policy(
        db=db,
        org_id=order["org_id"],
    )

    prepared_items, requested_amount = (
        _prepare_refund_items(
            db=db,
            order_id=order["order_id"],
            refund_in=refund_in,
        )
    )

    refund_policy_id = (
        policy["refund_policy_id"]
        if policy is not None
        else None
    )

    try:
        result = db.execute(
            text(
                """
                INSERT INTO refund_requests (
                    order_id,
                    buyer_user_id,
                    refund_policy_id,
                    refund_reason,
                    requested_amount,
                    approved_amount,
                    refund_status
                )
                VALUES (
                    :order_id,
                    :buyer_user_id,
                    :refund_policy_id,
                    :refund_reason,
                    :requested_amount,
                    NULL,
                    'REQUESTED'
                )
                """
            ),
            {
                "order_id": order["order_id"],
                "buyer_user_id": user_id,
                "refund_policy_id": refund_policy_id,
                "refund_reason": refund_in.refund_reason,
                "requested_amount": requested_amount,
            },
        )

        refund_request_id = result.lastrowid

        for item in prepared_items:
            db.execute(
                text(
                    """
                    INSERT INTO refund_items (
                        refund_request_id,
                        order_item_id,
                        refund_quantity,
                        refund_amount
                    )
                    VALUES (
                        :refund_request_id,
                        :order_item_id,
                        :refund_quantity,
                        :refund_amount
                    )
                    """
                ),
                {
                    "refund_request_id": (
                        refund_request_id
                    ),
                    "order_item_id": item[
                        "order_item_id"
                    ],
                    "refund_quantity": item[
                        "refund_quantity"
                    ],
                    "refund_amount": item[
                        "refund_amount"
                    ],
                },
            )

        db.commit()

    except HTTPException:
        db.rollback()
        raise

    except SQLAlchemyError as exc:
        db.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "환불 요청 저장 중 "
                "데이터베이스 오류가 발생했습니다."
            ),
        ) from exc

    return get_customer_refund_detail(
        db=db,
        user_id=user_id,
        refund_request_id=refund_request_id,
    )


def get_customer_refund_detail(
    db: Session,
    user_id: int,
    refund_request_id: int,
) -> CustomerRefundResponse:
    """
    로그인한 고객 본인의 환불 요청 상세 조회.
    """

    refund = db.execute(
        text(
            """
            SELECT
                rr.refund_request_id,
                rr.order_id,
                o.order_no,
                rr.buyer_user_id,
                rr.refund_policy_id,
                rr.refund_reason,
                rr.requested_amount,
                rr.approved_amount,
                rr.refund_status,
                rr.requested_at,
                rr.approved_at,
                rr.completed_at

            FROM refund_requests AS rr

            INNER JOIN orders AS o
                ON o.order_id = rr.order_id

            WHERE rr.refund_request_id =
                  :refund_request_id
              AND rr.buyer_user_id = :user_id
            """
        ),
        {
            "refund_request_id": refund_request_id,
            "user_id": user_id,
        },
    ).mappings().first()

    if refund is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="환불 요청을 찾을 수 없습니다.",
        )

    item_rows = db.execute(
        text(
            """
            SELECT
                ri.refund_item_id,
                ri.order_item_id,
                oi.product_id,
                oi.variant_id,
                oi.product_name_snapshot,
                oi.sku_snapshot,
                oi.quantity AS ordered_quantity,
                ri.refund_quantity,
                oi.unit_price,
                ri.refund_amount

            FROM refund_items AS ri

            INNER JOIN order_items AS oi
                ON oi.order_item_id =
                   ri.order_item_id

            WHERE ri.refund_request_id =
                  :refund_request_id

            ORDER BY ri.refund_item_id
            """
        ),
        {
            "refund_request_id": refund_request_id,
        },
    ).mappings().all()

    items = [
        CustomerRefundItemResponse(
            refund_item_id=row[
                "refund_item_id"
            ],
            order_item_id=row[
                "order_item_id"
            ],
            product_id=row[
                "product_id"
            ],
            variant_id=row[
                "variant_id"
            ],
            product_name_snapshot=row[
                "product_name_snapshot"
            ],
            sku_snapshot=row[
                "sku_snapshot"
            ],
            ordered_quantity=row[
                "ordered_quantity"
            ],
            refund_quantity=row[
                "refund_quantity"
            ],
            unit_price=row[
                "unit_price"
            ],
            refund_amount=row[
                "refund_amount"
            ],
        )
        for row in item_rows
    ]

    return CustomerRefundResponse(
        refund_request_id=refund[
            "refund_request_id"
        ],
        order_id=refund["order_id"],
        order_no=refund["order_no"],
        buyer_user_id=refund[
            "buyer_user_id"
        ],
        refund_policy_id=refund[
            "refund_policy_id"
        ],
        refund_reason=refund[
            "refund_reason"
        ],
        requested_amount=refund[
            "requested_amount"
        ],
        approved_amount=refund[
            "approved_amount"
        ],
        refund_status=refund[
            "refund_status"
        ],
        requested_at=refund[
            "requested_at"
        ],
        approved_at=refund[
            "approved_at"
        ],
        completed_at=refund[
            "completed_at"
        ],
        items=items,
    )


def get_customer_refunds(
    db: Session,
    user_id: int,
    page: int = 1,
    size: int = 20,
) -> CustomerRefundListResponse:
    """
    로그인한 고객의 환불 요청 목록 조회.
    """

    total = db.execute(
        text(
            """
            SELECT COUNT(*)
            FROM refund_requests
            WHERE buyer_user_id = :user_id
            """
        ),
        {
            "user_id": user_id,
        },
    ).scalar_one()

    rows = db.execute(
        text(
            """
            SELECT
                rr.refund_request_id,
                rr.order_id,
                o.order_no,
                rr.refund_reason,
                rr.requested_amount,
                rr.approved_amount,
                rr.refund_status,
                rr.requested_at,
                rr.approved_at,
                rr.completed_at

            FROM refund_requests AS rr

            INNER JOIN orders AS o
                ON o.order_id = rr.order_id

            WHERE rr.buyer_user_id = :user_id

            ORDER BY
                rr.requested_at DESC,
                rr.refund_request_id DESC

            LIMIT :limit
            OFFSET :offset
            """
        ),
        {
            "user_id": user_id,
            "limit": size,
            "offset": (
                (page - 1) * size
            ),
        },
    ).mappings().all()

    items = [
        CustomerRefundListItemResponse(
            refund_request_id=row[
                "refund_request_id"
            ],
            order_id=row[
                "order_id"
            ],
            order_no=row[
                "order_no"
            ],
            refund_reason=row[
                "refund_reason"
            ],
            requested_amount=row[
                "requested_amount"
            ],
            approved_amount=row[
                "approved_amount"
            ],
            refund_status=row[
                "refund_status"
            ],
            requested_at=row[
                "requested_at"
            ],
            approved_at=row[
                "approved_at"
            ],
            completed_at=row[
                "completed_at"
            ],
        )
        for row in rows
    ]

    return CustomerRefundListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
    )


def get_customer_refund_status(
    db: Session,
    user_id: int,
    refund_request_id: int,
) -> CustomerRefundStatusResponse:
    """
    고객 환불 처리 상태 조회.
    """

    row = db.execute(
        text(
            """
            SELECT
                rr.refund_request_id,
                rr.order_id,
                o.order_no,
                rr.refund_status,
                rr.requested_amount,
                rr.approved_amount,
                rr.requested_at,
                rr.approved_at,
                rr.completed_at

            FROM refund_requests AS rr

            INNER JOIN orders AS o
                ON o.order_id = rr.order_id

            WHERE rr.refund_request_id =
                  :refund_request_id
              AND rr.buyer_user_id = :user_id
            """
        ),
        {
            "refund_request_id": refund_request_id,
            "user_id": user_id,
        },
    ).mappings().first()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="환불 요청을 찾을 수 없습니다.",
        )

    return CustomerRefundStatusResponse(
        refund_request_id=row[
            "refund_request_id"
        ],
        order_id=row["order_id"],
        order_no=row["order_no"],
        refund_status=row[
            "refund_status"
        ],
        requested_amount=row[
            "requested_amount"
        ],
        approved_amount=row[
            "approved_amount"
        ],
        requested_at=row[
            "requested_at"
        ],
        approved_at=row[
            "approved_at"
        ],
        completed_at=row[
            "completed_at"
        ],
    )