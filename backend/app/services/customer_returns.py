from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.schemas.customer_returns import (
    CustomerReturnCreateRequest,
    CustomerReturnItemResponse,
    CustomerReturnListItemResponse,
    CustomerReturnListResponse,
    CustomerReturnResponse,
    CustomerReturnStatusResponse,
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


def _check_returnable_order(
    db: Session,
    user_id: int,
    order_id: int,
):
    """
    반품 신청 가능한 주문인지 확인한다.

    현재 반품은 실제 상품을 수령한 이후의 절차로 보고
    DELIVERED 또는 COMPLETED 상태에서만 허용한다.
    """

    order = _get_owned_order(
        db=db,
        user_id=user_id,
        order_id=order_id,
    )

    returnable_statuses = {
        "DELIVERED",
        "COMPLETED",
    }

    if order["order_status"] not in returnable_statuses:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "현재 상태의 주문은 반품을 신청할 수 없습니다. "
                "배송 완료된 주문만 반품 신청이 가능합니다."
            ),
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
            detail="결제가 완료된 주문만 반품을 신청할 수 있습니다.",
        )

    return order


def _normalize_return_items(
    return_in: CustomerReturnCreateRequest,
) -> list[dict]:
    """
    같은 order_item_id가 요청에 여러 번 들어온 경우
    반품 수량을 하나로 합친다.
    """

    normalized: dict[int, dict] = {}

    for item in return_in.items:
        if item.order_item_id not in normalized:
            normalized[item.order_item_id] = {
                "order_item_id": item.order_item_id,
                "return_quantity": item.return_quantity,
            }
        else:
            normalized[
                item.order_item_id
            ]["return_quantity"] += item.return_quantity

    return list(normalized.values())


def _get_returned_quantity(
    db: Session,
    order_item_id: int,
) -> int:
    """
    이미 반품 신청 중이거나 처리 완료된 수량을 계산한다.

    REJECTED, CANCELLED 반품은 다시 신청할 수 있도록
    기존 반품 수량 계산에서 제외한다.
    """

    quantity = db.execute(
        text(
            """
            SELECT COALESCE(SUM(ri.return_quantity), 0)

            FROM return_items AS ri

            INNER JOIN return_requests AS rr
                ON rr.return_request_id =
                   ri.return_request_id

            WHERE ri.order_item_id = :order_item_id
              AND rr.return_status NOT IN (
                    'REJECTED',
                    'CANCELLED'
              )
            """
        ),
        {
            "order_item_id": order_item_id,
        },
    ).scalar_one()

    return int(quantity or 0)


def _prepare_return_items(
    db: Session,
    order_id: int,
    return_in: CustomerReturnCreateRequest,
) -> list[dict]:
    """
    반품 상품이 실제 주문상품인지 확인하고
    반품 가능한 수량을 검증한다.
    """

    normalized_items = _normalize_return_items(
        return_in=return_in,
    )

    prepared_items: list[dict] = []

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
                    "해당 주문에 포함되지 않은 상품이 "
                    "반품 요청에 포함되어 있습니다."
                ),
            )

        already_returned_quantity = (
            _get_returned_quantity(
                db=db,
                order_item_id=order_item[
                    "order_item_id"
                ],
            )
        )

        remaining_quantity = (
            int(order_item["quantity"])
            - already_returned_quantity
        )

        return_quantity = int(
            item["return_quantity"]
        )

        if return_quantity > remaining_quantity:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"'{order_item['product_name_snapshot']}'의 "
                    "반품 가능 수량을 초과했습니다."
                ),
            )

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
                "return_quantity": return_quantity,
            }
        )

    return prepared_items


def create_customer_return(
    db: Session,
    user_id: int,
    return_in: CustomerReturnCreateRequest,
) -> CustomerReturnResponse:
    """
    고객 반품 신청을 생성한다.

    반품 요청은 REQUESTED 상태로 생성되며,
    검수 및 환불 처리는 이후 관리자 기능에서 진행한다.
    """

    order = _check_returnable_order(
        db=db,
        user_id=user_id,
        order_id=return_in.order_id,
    )

    pickup_method = (
        return_in.pickup_method.strip().upper()
    )

    allowed_pickup_methods = {
        "PICKUP",
        "SELF_SHIP",
    }

    if pickup_method not in allowed_pickup_methods:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "pickup_method는 PICKUP 또는 "
                "SELF_SHIP이어야 합니다."
            ),
        )

    return_reason_code = (
        return_in.return_reason_code.strip()
    )

    if not return_reason_code:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="반품 사유 코드는 필수입니다.",
        )

    return_reason_detail = (
        return_in.return_reason_detail.strip()
        if return_in.return_reason_detail
        else None
    )

    prepared_items = _prepare_return_items(
        db=db,
        order_id=order["order_id"],
        return_in=return_in,
    )

    try:
        result = db.execute(
            text(
                """
                INSERT INTO return_requests (
                    order_id,
                    return_reason_code,
                    return_reason_detail,
                    return_status,
                    pickup_method,
                    carrier_name,
                    tracking_no,
                    refund_request_id
                )
                VALUES (
                    :order_id,
                    :return_reason_code,
                    :return_reason_detail,
                    'REQUESTED',
                    :pickup_method,
                    NULL,
                    NULL,
                    NULL
                )
                """
            ),
            {
                "order_id": order["order_id"],
                "return_reason_code": (
                    return_reason_code
                ),
                "return_reason_detail": (
                    return_reason_detail
                ),
                "pickup_method": pickup_method,
            },
        )

        return_request_id = result.lastrowid

        for item in prepared_items:
            db.execute(
                text(
                    """
                    INSERT INTO return_items (
                        return_request_id,
                        order_item_id,
                        return_quantity,
                        item_condition,
                        inspection_result,
                        inspection_note
                    )
                    VALUES (
                        :return_request_id,
                        :order_item_id,
                        :return_quantity,
                        NULL,
                        'PENDING',
                        NULL
                    )
                    """
                ),
                {
                    "return_request_id": (
                        return_request_id
                    ),
                    "order_item_id": item[
                        "order_item_id"
                    ],
                    "return_quantity": item[
                        "return_quantity"
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
                "반품 신청 처리 중 "
                "데이터베이스 오류가 발생했습니다."
            ),
        ) from exc

    return get_customer_return_detail(
        db=db,
        user_id=user_id,
        return_request_id=return_request_id,
    )


def get_customer_return_detail(
    db: Session,
    user_id: int,
    return_request_id: int,
) -> CustomerReturnResponse:
    """
    로그인한 고객 본인의 반품 요청 상세 조회.
    """

    return_request = db.execute(
        text(
            """
            SELECT
                rr.return_request_id,
                rr.order_id,
                o.order_no,
                rr.return_reason_code,
                rr.return_reason_detail,
                rr.return_status,
                rr.pickup_method,
                rr.carrier_name,
                rr.tracking_no,
                rr.requested_at,
                rr.pickup_at,
                rr.received_at,
                rr.inspected_at,
                rr.completed_at,
                rr.refund_request_id

            FROM return_requests AS rr

            INNER JOIN orders AS o
                ON o.order_id = rr.order_id

            WHERE rr.return_request_id =
                  :return_request_id
              AND o.buyer_user_id = :user_id
            """
        ),
        {
            "return_request_id": return_request_id,
            "user_id": user_id,
        },
    ).mappings().first()

    if return_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="반품 요청을 찾을 수 없습니다.",
        )

    item_rows = db.execute(
        text(
            """
            SELECT
                ri.return_item_id,
                ri.order_item_id,
                oi.product_id,
                oi.variant_id,
                oi.product_name_snapshot,
                oi.sku_snapshot,
                oi.quantity AS ordered_quantity,
                ri.return_quantity,
                ri.item_condition,
                ri.inspection_result,
                ri.inspection_note

            FROM return_items AS ri

            INNER JOIN order_items AS oi
                ON oi.order_item_id =
                   ri.order_item_id

            WHERE ri.return_request_id =
                  :return_request_id

            ORDER BY ri.return_item_id
            """
        ),
        {
            "return_request_id": return_request_id,
        },
    ).mappings().all()

    items = [
        CustomerReturnItemResponse(
            return_item_id=row[
                "return_item_id"
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
            return_quantity=row[
                "return_quantity"
            ],
            item_condition=row[
                "item_condition"
            ],
            inspection_result=row[
                "inspection_result"
            ],
            inspection_note=row[
                "inspection_note"
            ],
        )
        for row in item_rows
    ]

    return CustomerReturnResponse(
        return_request_id=return_request[
            "return_request_id"
        ],
        order_id=return_request["order_id"],
        order_no=return_request["order_no"],
        return_reason_code=return_request[
            "return_reason_code"
        ],
        return_reason_detail=return_request[
            "return_reason_detail"
        ],
        return_status=return_request[
            "return_status"
        ],
        pickup_method=return_request[
            "pickup_method"
        ],
        carrier_name=return_request[
            "carrier_name"
        ],
        tracking_no=return_request[
            "tracking_no"
        ],
        requested_at=return_request[
            "requested_at"
        ],
        pickup_at=return_request[
            "pickup_at"
        ],
        received_at=return_request[
            "received_at"
        ],
        inspected_at=return_request[
            "inspected_at"
        ],
        completed_at=return_request[
            "completed_at"
        ],
        refund_request_id=return_request[
            "refund_request_id"
        ],
        items=items,
    )


def get_customer_returns(
    db: Session,
    user_id: int,
    page: int = 1,
    size: int = 20,
) -> CustomerReturnListResponse:
    """
    로그인한 고객의 반품 요청 목록 조회.
    """

    total = db.execute(
        text(
            """
            SELECT COUNT(*)

            FROM return_requests AS rr

            INNER JOIN orders AS o
                ON o.order_id = rr.order_id

            WHERE o.buyer_user_id = :user_id
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
                rr.return_request_id,
                rr.order_id,
                o.order_no,
                rr.return_reason_code,
                rr.return_reason_detail,
                rr.return_status,
                rr.pickup_method,
                rr.carrier_name,
                rr.tracking_no,
                rr.requested_at,
                rr.completed_at,
                rr.refund_request_id

            FROM return_requests AS rr

            INNER JOIN orders AS o
                ON o.order_id = rr.order_id

            WHERE o.buyer_user_id = :user_id

            ORDER BY
                rr.requested_at DESC,
                rr.return_request_id DESC

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
        CustomerReturnListItemResponse(
            return_request_id=row[
                "return_request_id"
            ],
            order_id=row[
                "order_id"
            ],
            order_no=row[
                "order_no"
            ],
            return_reason_code=row[
                "return_reason_code"
            ],
            return_reason_detail=row[
                "return_reason_detail"
            ],
            return_status=row[
                "return_status"
            ],
            pickup_method=row[
                "pickup_method"
            ],
            carrier_name=row[
                "carrier_name"
            ],
            tracking_no=row[
                "tracking_no"
            ],
            requested_at=row[
                "requested_at"
            ],
            completed_at=row[
                "completed_at"
            ],
            refund_request_id=row[
                "refund_request_id"
            ],
        )
        for row in rows
    ]

    return CustomerReturnListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
    )


def get_customer_return_status(
    db: Session,
    user_id: int,
    return_request_id: int,
) -> CustomerReturnStatusResponse:
    """
    고객 반품 처리 상태 조회.
    """

    row = db.execute(
        text(
            """
            SELECT
                rr.return_request_id,
                rr.order_id,
                o.order_no,
                rr.return_status,
                rr.pickup_method,
                rr.carrier_name,
                rr.tracking_no,
                rr.requested_at,
                rr.pickup_at,
                rr.received_at,
                rr.inspected_at,
                rr.completed_at,
                rr.refund_request_id

            FROM return_requests AS rr

            INNER JOIN orders AS o
                ON o.order_id = rr.order_id

            WHERE rr.return_request_id =
                  :return_request_id
              AND o.buyer_user_id = :user_id
            """
        ),
        {
            "return_request_id": return_request_id,
            "user_id": user_id,
        },
    ).mappings().first()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="반품 요청을 찾을 수 없습니다.",
        )

    return CustomerReturnStatusResponse(
        return_request_id=row[
            "return_request_id"
        ],
        order_id=row["order_id"],
        order_no=row["order_no"],
        return_status=row[
            "return_status"
        ],
        pickup_method=row[
            "pickup_method"
        ],
        carrier_name=row[
            "carrier_name"
        ],
        tracking_no=row[
            "tracking_no"
        ],
        requested_at=row[
            "requested_at"
        ],
        pickup_at=row[
            "pickup_at"
        ],
        received_at=row[
            "received_at"
        ],
        inspected_at=row[
            "inspected_at"
        ],
        completed_at=row[
            "completed_at"
        ],
        refund_request_id=row[
            "refund_request_id"
        ],
    )