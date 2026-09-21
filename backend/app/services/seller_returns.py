"""Service layer for seller_returns (S-RET-01~07).

판매자는 자신의 상품이 포함된 반품 요청만 조회하고 처리할 수 있다.

판매자 소유권은 다음 연결로 확인한다.

return_requests
    -> return_items
    -> order_items
    -> products.seller_user_id
    -> auth.user_id

DB 테이블이나 컬럼은 변경하지 않는다.
"""

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.dependencies.auth import AuthContext
from app.schemas.seller_returns import (
    SellerReturnDecisionRequest,
    SellerReturnDetailOut,
    SellerReturnInspectionUpdateRequest,
    SellerReturnItemOut,
    SellerReturnListItemOut,
    SellerReturnListOut,
    SellerReturnPickupUpdateRequest,
)


RETURN_STATUSES = {
    "REQUESTED",
    "APPROVED",
    "REJECTED",
    "PICKUP_REQUESTED",
    "PICKED_UP",
    "RECEIVED",
    "INSPECTING",
    "COMPLETED",
    "CANCELLED",
}


def _not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="반품 요청을 찾을 수 없습니다.",
    )


def _database_error(
    exc: SQLAlchemyError,
    detail: str,
) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=detail,
    )


def _normalize_optional_text(
    value: str | None,
) -> str | None:
    if value is None:
        return None

    normalized = value.strip()

    return normalized or None


def _get_owned_return_request(
    db: Session,
    return_request_id: int,
    auth: AuthContext,
):
    """현재 판매자가 소유한 반품 요청인지 확인한다."""

    row = db.execute(
        text(
            """
            SELECT DISTINCT
                rr.return_request_id,
                rr.order_id,
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

            INNER JOIN return_items AS ri
                ON ri.return_request_id =
                   rr.return_request_id

            INNER JOIN order_items AS oi
                ON oi.order_item_id =
                   ri.order_item_id

            INNER JOIN products AS p
                ON p.product_id = oi.product_id

            WHERE rr.return_request_id =
                  :return_request_id
              AND p.seller_user_id =
                  :seller_user_id
            """
        ),
        {
            "return_request_id": return_request_id,
            "seller_user_id": auth.user_id,
        },
    ).mappings().first()

    if row is None:
        raise _not_found()

    return row


def list_return_requests(
    db: Session,
    auth: AuthContext,
    page: int = 1,
    size: int = 20,
    return_status: str | None = None,
    keyword: str | None = None,
) -> SellerReturnListOut:
    """현재 판매자의 반품 요청 목록을 조회한다."""

    normalized_status = (
        return_status.strip().upper()
        if return_status
        else None
    )

    if (
        normalized_status is not None
        and normalized_status not in RETURN_STATUSES
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="올바르지 않은 반품 상태입니다.",
        )

    normalized_keyword = (
        keyword.strip()
        if keyword and keyword.strip()
        else None
    )

    keyword_like = (
        f"%{normalized_keyword}%"
        if normalized_keyword
        else None
    )

    params = {
        "seller_user_id": auth.user_id,
        "return_status": normalized_status,
        "keyword_like": keyword_like,
    }

    total = db.execute(
        text(
            """
            SELECT COUNT(
                DISTINCT rr.return_request_id
            )

            FROM return_requests AS rr

            INNER JOIN orders AS o
                ON o.order_id = rr.order_id

            INNER JOIN users AS u
                ON u.user_id = o.buyer_user_id

            INNER JOIN return_items AS ri
                ON ri.return_request_id =
                   rr.return_request_id

            INNER JOIN order_items AS oi
                ON oi.order_item_id =
                   ri.order_item_id

            INNER JOIN products AS p
                ON p.product_id = oi.product_id

            WHERE p.seller_user_id =
                  :seller_user_id

              AND (
                    :return_status IS NULL
                    OR rr.return_status =
                       :return_status
              )

              AND (
                    :keyword_like IS NULL
                    OR o.order_no LIKE :keyword_like
                    OR u.user_name LIKE :keyword_like
                    OR oi.product_name_snapshot
                       LIKE :keyword_like
              )
            """
        ),
        params,
    ).scalar_one()

    rows = db.execute(
        text(
            """
            SELECT
                rr.return_request_id,
                rr.order_id,
                o.order_no,

                o.buyer_user_id,
                u.user_name AS buyer_name,

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

                rr.refund_request_id,

                COUNT(
                    DISTINCT ri.return_item_id
                ) AS item_count,

                COALESCE(
                    SUM(ri.return_quantity),
                    0
                ) AS total_return_quantity

            FROM return_requests AS rr

            INNER JOIN orders AS o
                ON o.order_id = rr.order_id

            INNER JOIN users AS u
                ON u.user_id = o.buyer_user_id

            INNER JOIN return_items AS ri
                ON ri.return_request_id =
                   rr.return_request_id

            INNER JOIN order_items AS oi
                ON oi.order_item_id =
                   ri.order_item_id

            INNER JOIN products AS p
                ON p.product_id = oi.product_id

            WHERE p.seller_user_id =
                  :seller_user_id

              AND (
                    :return_status IS NULL
                    OR rr.return_status =
                       :return_status
              )

              AND (
                    :keyword_like IS NULL
                    OR o.order_no LIKE :keyword_like
                    OR u.user_name LIKE :keyword_like
                    OR oi.product_name_snapshot
                       LIKE :keyword_like
              )

            GROUP BY
                rr.return_request_id,
                rr.order_id,
                o.order_no,
                o.buyer_user_id,
                u.user_name,
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

            ORDER BY
                rr.requested_at DESC,
                rr.return_request_id DESC

            LIMIT :size
            OFFSET :offset
            """
        ),
        {
            **params,
            "size": size,
            "offset": (page - 1) * size,
        },
    ).mappings().all()

    items = [
        SellerReturnListItemOut(
            **dict(row),
        )
        for row in rows
    ]

    return SellerReturnListOut(
        items=items,
        total=int(total or 0),
        page=page,
        size=size,
    )


def get_return_detail(
    db: Session,
    return_request_id: int,
    auth: AuthContext,
) -> SellerReturnDetailOut:
    """현재 판매자의 반품 요청 상세를 조회한다."""

    _get_owned_return_request(
        db=db,
        return_request_id=return_request_id,
        auth=auth,
    )

    header = db.execute(
        text(
            """
            SELECT DISTINCT
                rr.return_request_id,
                rr.order_id,
                o.order_no,

                o.buyer_user_id,
                u.user_name AS buyer_name,

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

            INNER JOIN users AS u
                ON u.user_id = o.buyer_user_id

            INNER JOIN return_items AS ri
                ON ri.return_request_id =
                   rr.return_request_id

            INNER JOIN order_items AS oi
                ON oi.order_item_id =
                   ri.order_item_id

            INNER JOIN products AS p
                ON p.product_id = oi.product_id

            WHERE rr.return_request_id =
                  :return_request_id
              AND p.seller_user_id =
                  :seller_user_id
            """
        ),
        {
            "return_request_id": return_request_id,
            "seller_user_id": auth.user_id,
        },
    ).mappings().first()

    if header is None:
        raise _not_found()

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

            INNER JOIN products AS p
                ON p.product_id = oi.product_id

            WHERE ri.return_request_id =
                  :return_request_id
              AND p.seller_user_id =
                  :seller_user_id

            ORDER BY ri.return_item_id
            """
        ),
        {
            "return_request_id": return_request_id,
            "seller_user_id": auth.user_id,
        },
    ).mappings().all()

    items = [
        SellerReturnItemOut(
            **dict(row),
        )
        for row in item_rows
    ]

    total_return_quantity = sum(
        item.return_quantity
        for item in items
    )

    return SellerReturnDetailOut(
        **dict(header),
        item_count=len(items),
        total_return_quantity=total_return_quantity,
        items=items,
    )


def update_pickup(
    db: Session,
    return_request_id: int,
    payload: SellerReturnPickupUpdateRequest,
    auth: AuthContext,
) -> SellerReturnDetailOut:
    """회수 요청, 회수 완료, 입고 완료 상태를 처리한다."""

    return_request = _get_owned_return_request(
        db=db,
        return_request_id=return_request_id,
        auth=auth,
    )

    current_status = return_request[
        "return_status"
    ]

    target_status = payload.return_status

    allowed_transitions = {
        "REQUESTED": {
            "PICKUP_REQUESTED",
            "PICKED_UP",
        },
        "PICKUP_REQUESTED": {
            "PICKUP_REQUESTED",
            "PICKED_UP",
        },
        "PICKED_UP": {
            "PICKED_UP",
            "RECEIVED",
        },
        "RECEIVED": {
            "RECEIVED",
        },
    }

    allowed_targets = allowed_transitions.get(
        current_status,
        set(),
    )

    if target_status not in allowed_targets:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"{current_status} 상태에서는 "
                f"{target_status} 상태로 변경할 수 없습니다."
            ),
        )

    carrier_name = _normalize_optional_text(
        payload.carrier_name,
    )

    tracking_no = _normalize_optional_text(
        payload.tracking_no,
    )

    if carrier_name is None:
        carrier_name = return_request[
            "carrier_name"
        ]

    if tracking_no is None:
        tracking_no = return_request[
            "tracking_no"
        ]

    if target_status in {
        "PICKED_UP",
        "RECEIVED",
    }:
        if not carrier_name or not tracking_no:
            raise HTTPException(
                status_code=(
                    status.HTTP_422_UNPROCESSABLE_ENTITY
                ),
                detail=(
                    "회수 완료 처리 전 택배사와 "
                    "운송장 번호를 입력해야 합니다."
                ),
            )

    try:
        db.execute(
            text(
                """
                UPDATE return_requests

                SET
                    return_status =
                        :return_status,

                    carrier_name =
                        :carrier_name,

                    tracking_no =
                        :tracking_no,

                    pickup_at =
                        CASE
                            WHEN :return_status =
                                 'PICKED_UP'
                            THEN COALESCE(
                                pickup_at,
                                NOW()
                            )
                            ELSE pickup_at
                        END,

                    received_at =
                        CASE
                            WHEN :return_status =
                                 'RECEIVED'
                            THEN COALESCE(
                                received_at,
                                NOW()
                            )
                            ELSE received_at
                        END,

                    updated_at = NOW()

                WHERE return_request_id =
                      :return_request_id
                """
            ),
            {
                "return_request_id": (
                    return_request_id
                ),
                "return_status": target_status,
                "carrier_name": carrier_name,
                "tracking_no": tracking_no,
            },
        )

        db.commit()

    except SQLAlchemyError as exc:
        db.rollback()

        raise _database_error(
            exc=exc,
            detail=(
                "반품 회수 정보 저장 중 "
                "오류가 발생했습니다."
            ),
        ) from exc

    return get_return_detail(
        db=db,
        return_request_id=return_request_id,
        auth=auth,
    )


def update_item_inspection(
    db: Session,
    return_item_id: int,
    payload: SellerReturnInspectionUpdateRequest,
    auth: AuthContext,
) -> SellerReturnDetailOut:
    """반품 상품 한 건의 검수 결과를 저장한다."""

    row = db.execute(
        text(
            """
            SELECT
                ri.return_item_id,
                ri.return_request_id,
                rr.return_status

            FROM return_items AS ri

            INNER JOIN return_requests AS rr
                ON rr.return_request_id =
                   ri.return_request_id

            INNER JOIN order_items AS oi
                ON oi.order_item_id =
                   ri.order_item_id

            INNER JOIN products AS p
                ON p.product_id = oi.product_id

            WHERE ri.return_item_id =
                  :return_item_id
              AND p.seller_user_id =
                  :seller_user_id
            """
        ),
        {
            "return_item_id": return_item_id,
            "seller_user_id": auth.user_id,
        },
    ).mappings().first()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="반품 상품을 찾을 수 없습니다.",
        )

    if row["return_status"] not in {
        "RECEIVED",
        "INSPECTING",
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "입고 완료된 반품 요청만 "
                "검수할 수 있습니다."
            ),
        )

    item_condition = (
        payload.item_condition.strip()
    )

    if not item_condition:
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_ENTITY
            ),
            detail="상품 상태를 입력해 주세요.",
        )

    inspection_note = _normalize_optional_text(
        payload.inspection_note,
    )

    return_request_id = int(
        row["return_request_id"]
    )

    try:
        db.execute(
            text(
                """
                UPDATE return_items

                SET
                    item_condition =
                        :item_condition,

                    inspection_result =
                        :inspection_result,

                    inspection_note =
                        :inspection_note

                WHERE return_item_id =
                      :return_item_id
                """
            ),
            {
                "return_item_id": return_item_id,
                "item_condition": item_condition,
                "inspection_result": (
                    payload.inspection_result
                ),
                "inspection_note": inspection_note,
            },
        )

        pending_count = db.execute(
            text(
                """
                SELECT COUNT(*)

                FROM return_items AS ri

                INNER JOIN order_items AS oi
                    ON oi.order_item_id =
                       ri.order_item_id

                INNER JOIN products AS p
                    ON p.product_id = oi.product_id

                WHERE ri.return_request_id =
                      :return_request_id

                  AND p.seller_user_id =
                      :seller_user_id

                  AND ri.inspection_result =
                      'PENDING'
                """
            ),
            {
                "return_request_id": (
                    return_request_id
                ),
                "seller_user_id": auth.user_id,
            },
        ).scalar_one()

        db.execute(
            text(
                """
                UPDATE return_requests

                SET
                    return_status = 'INSPECTING',

                    inspected_at =
                        CASE
                            WHEN :pending_count = 0
                            THEN COALESCE(
                                inspected_at,
                                NOW()
                            )
                            ELSE inspected_at
                        END,

                    updated_at = NOW()

                WHERE return_request_id =
                      :return_request_id
                """
            ),
            {
                "return_request_id": (
                    return_request_id
                ),
                "pending_count": int(
                    pending_count or 0
                ),
            },
        )

        db.commit()

    except SQLAlchemyError as exc:
        db.rollback()

        raise _database_error(
            exc=exc,
            detail=(
                "반품 상품 검수 결과 저장 중 "
                "오류가 발생했습니다."
            ),
        ) from exc

    return get_return_detail(
        db=db,
        return_request_id=return_request_id,
        auth=auth,
    )


def decide_return(
    db: Session,
    return_request_id: int,
    payload: SellerReturnDecisionRequest,
    auth: AuthContext,
) -> SellerReturnDetailOut:
    """판매자가 검수 완료 후 반품을 승인하거나 반려한다."""

    return_request = _get_owned_return_request(
        db=db,
        return_request_id=return_request_id,
        auth=auth,
    )

    if return_request["return_status"] != "INSPECTING":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "검수 중인 반품 요청만 "
                "승인 또는 반려할 수 있습니다."
            ),
        )

    counts = db.execute(
        text(
            """
            SELECT
                COUNT(*) AS total_count,

                SUM(
                    CASE
                        WHEN ri.inspection_result =
                             'PENDING'
                        THEN 1
                        ELSE 0
                    END
                ) AS pending_count,

                SUM(
                    CASE
                        WHEN ri.inspection_result =
                             'REJECTED'
                        THEN 1
                        ELSE 0
                    END
                ) AS rejected_count

            FROM return_items AS ri

            INNER JOIN order_items AS oi
                ON oi.order_item_id =
                   ri.order_item_id

            INNER JOIN products AS p
                ON p.product_id = oi.product_id

            WHERE ri.return_request_id =
                  :return_request_id
              AND p.seller_user_id =
                  :seller_user_id
            """
        ),
        {
            "return_request_id": return_request_id,
            "seller_user_id": auth.user_id,
        },
    ).mappings().one()

    total_count = int(
        counts["total_count"] or 0
    )

    pending_count = int(
        counts["pending_count"] or 0
    )

    rejected_count = int(
        counts["rejected_count"] or 0
    )

    if total_count == 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="검수할 반품 상품이 없습니다.",
        )

    if pending_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "모든 반품 상품의 검수를 "
                "완료한 후 처리해 주세요."
            ),
        )

    decision = payload.decision

    if (
        decision == "APPROVED"
        and rejected_count > 0
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "반려 검수 결과가 포함되어 있어 "
                "반품을 승인할 수 없습니다."
            ),
        )

    if (
        decision == "REJECTED"
        and rejected_count == 0
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "반품 반려를 선택하려면 "
                "한 건 이상의 검수 결과가 "
                "반려여야 합니다."
            ),
        )

    try:
        db.execute(
            text(
                """
                UPDATE return_requests

                SET
                    return_status = :decision,

                    inspected_at = COALESCE(
                        inspected_at,
                        NOW()
                    ),

                    updated_at = NOW()

                WHERE return_request_id =
                      :return_request_id
                """
            ),
            {
                "return_request_id": (
                    return_request_id
                ),
                "decision": decision,
            },
        )

        db.commit()

    except SQLAlchemyError as exc:
        db.rollback()

        raise _database_error(
            exc=exc,
            detail=(
                "판매자 반품 처리 중 "
                "오류가 발생했습니다."
            ),
        ) from exc

    return get_return_detail(
        db=db,
        return_request_id=return_request_id,
        auth=auth,
    )