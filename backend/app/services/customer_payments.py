from decimal import Decimal
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.schemas.customer_payments import (
    CustomerPaymentApproveRequest,
    CustomerPaymentRequestCreate,
    CustomerPaymentResponse,
    CustomerPaymentStatusResponse,
    CustomerPaymentTransactionResponse,
)


def _generate_key(prefix: str) -> str:
    """
    테스트/내부 처리에 사용할 고유 키 생성.
    """

    return f"{prefix}_{uuid4().hex}"


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


def _get_owned_payment(
    db: Session,
    user_id: int,
    payment_id: int,
):
    """
    로그인한 고객 본인의 결제 정보를 조회한다.
    """

    payment = db.execute(
        text(
            """
            SELECT
                p.payment_id,
                p.order_id,
                p.pg_provider,
                p.payment_key,
                p.pg_order_id,
                p.customer_key,
                p.payment_type,
                p.payment_method,
                p.payment_status,
                p.requested_amount,
                p.approved_amount,
                p.cancelled_amount,
                p.balance_amount,
                p.currency,
                p.receipt_url,
                p.requested_at,
                p.approved_at,
                p.cancelled_at,
                p.created_at
            FROM payments AS p

            INNER JOIN orders AS o
                ON o.order_id = p.order_id

            WHERE p.payment_id = :payment_id
              AND o.buyer_user_id = :user_id
            """
        ),
        {
            "payment_id": payment_id,
            "user_id": user_id,
        },
    ).mappings().first()

    if payment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="결제 정보를 찾을 수 없습니다.",
        )

    return payment


def _get_payment_transactions(
    db: Session,
    payment_id: int,
) -> list[CustomerPaymentTransactionResponse]:
    """
    결제 처리 이력을 조회한다.
    """

    rows = db.execute(
        text(
            """
            SELECT
                transaction_id,
                payment_id,
                transaction_key,
                transaction_type,
                transaction_status,
                transaction_amount,
                pg_transaction_id,
                idempotency_key,
                created_at
            FROM payment_transactions
            WHERE payment_id = :payment_id
            ORDER BY
                created_at ASC,
                transaction_id ASC
            """
        ),
        {
            "payment_id": payment_id,
        },
    ).mappings().all()

    return [
        CustomerPaymentTransactionResponse(
            transaction_id=row["transaction_id"],
            payment_id=row["payment_id"],
            transaction_key=row["transaction_key"],
            transaction_type=row["transaction_type"],
            transaction_status=row["transaction_status"],
            transaction_amount=row["transaction_amount"],
            pg_transaction_id=row["pg_transaction_id"],
            idempotency_key=row["idempotency_key"],
            created_at=row["created_at"],
        )
        for row in rows
    ]


def get_customer_payment(
    db: Session,
    user_id: int,
    payment_id: int,
) -> CustomerPaymentResponse:
    """
    고객 본인의 결제 상세 조회.
    """

    payment = _get_owned_payment(
        db=db,
        user_id=user_id,
        payment_id=payment_id,
    )

    transactions = _get_payment_transactions(
        db=db,
        payment_id=payment_id,
    )

    return CustomerPaymentResponse(
        payment_id=payment["payment_id"],
        order_id=payment["order_id"],
        pg_provider=payment["pg_provider"],
        payment_key=payment["payment_key"],
        pg_order_id=payment["pg_order_id"],
        customer_key=payment["customer_key"],
        payment_type=payment["payment_type"],
        payment_method=payment["payment_method"],
        payment_status=payment["payment_status"],
        requested_amount=payment["requested_amount"],
        approved_amount=payment["approved_amount"],
        cancelled_amount=payment["cancelled_amount"],
        balance_amount=payment["balance_amount"],
        currency=payment["currency"],
        receipt_url=payment["receipt_url"],
        requested_at=payment["requested_at"],
        approved_at=payment["approved_at"],
        cancelled_at=payment["cancelled_at"],
        created_at=payment["created_at"],
        transactions=transactions,
    )


def create_customer_payment_request(
    db: Session,
    user_id: int,
    payment_in: CustomerPaymentRequestCreate,
) -> CustomerPaymentResponse:
    """
    고객 결제 요청 생성.

    고객이 결제 금액을 직접 결정하지 않는다.
    orders.total_amount를 DB에서 조회해서
    requested_amount로 사용한다.

    실제 PG 승인 전 상태는 READY이다.
    """

    order = _get_owned_order(
        db=db,
        user_id=user_id,
        order_id=payment_in.order_id,
    )

    if order["order_status"] != "PAYMENT_PENDING":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="결제 대기 상태의 주문만 결제를 요청할 수 있습니다.",
        )

    existing_payment = db.execute(
        text(
            """
            SELECT
                payment_id,
                payment_status
            FROM payments
            WHERE order_id = :order_id
            ORDER BY payment_id DESC
            LIMIT 1
            """
        ),
        {
            "order_id": payment_in.order_id,
        },
    ).mappings().first()

    if existing_payment is not None:
        if existing_payment["payment_status"] == "READY":
            return get_customer_payment(
                db=db,
                user_id=user_id,
                payment_id=existing_payment["payment_id"],
            )

        if existing_payment["payment_status"] == "DONE":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="이미 결제가 완료된 주문입니다.",
            )

    requested_amount = Decimal(
        order["total_amount"]
    )

    pending_payment_key = _generate_key(
        "pending"
    )

    transaction_key = _generate_key(
        "request"
    )

    idempotency_key = _generate_key(
        "idempotency"
    )

    try:
        result = db.execute(
            text(
                """
                INSERT INTO payments (
                    order_id,
                    pg_provider,
                    payment_key,
                    pg_order_id,
                    customer_key,
                    payment_type,
                    payment_method,
                    payment_status,
                    requested_amount,
                    approved_amount,
                    cancelled_amount,
                    balance_amount,
                    currency,
                    requested_at
                )
                VALUES (
                    :order_id,
                    :pg_provider,
                    :payment_key,
                    :pg_order_id,
                    :customer_key,
                    :payment_type,
                    :payment_method,
                    :payment_status,
                    :requested_amount,
                    :approved_amount,
                    :cancelled_amount,
                    :balance_amount,
                    :currency,
                    NOW()
                )
                """
            ),
            {
                "order_id": order["order_id"],
                "pg_provider": payment_in.pg_provider,
                "payment_key": pending_payment_key,
                "pg_order_id": order["order_no"],
                "customer_key": f"user-{user_id}",
                "payment_type": "NORMAL",
                "payment_method": payment_in.payment_method,
                "payment_status": "READY",
                "requested_amount": requested_amount,
                "approved_amount": Decimal("0.00"),
                "cancelled_amount": Decimal("0.00"),
                "balance_amount": requested_amount,
                "currency": "KRW",
            },
        )

        payment_id = result.lastrowid

        db.execute(
            text(
                """
                INSERT INTO payment_transactions (
                    payment_id,
                    transaction_key,
                    transaction_type,
                    transaction_status,
                    transaction_amount,
                    idempotency_key
                )
                VALUES (
                    :payment_id,
                    :transaction_key,
                    :transaction_type,
                    :transaction_status,
                    :transaction_amount,
                    :idempotency_key
                )
                """
            ),
            {
                "payment_id": payment_id,
                "transaction_key": transaction_key,
                "transaction_type": "REQUEST",
                "transaction_status": "READY",
                "transaction_amount": requested_amount,
                "idempotency_key": idempotency_key,
            },
        )

        db.commit()

    except IntegrityError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="중복된 결제 정보가 감지되었습니다.",
        ) from exc

    except SQLAlchemyError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="결제 요청 처리 중 데이터베이스 오류가 발생했습니다.",
        ) from exc

    return get_customer_payment(
        db=db,
        user_id=user_id,
        payment_id=payment_id,
    )


def _finalize_inventory(
    db: Session,
    order_id: int,
    org_id: int,
) -> None:
    """
    결제 승인 시 주문 생성 단계에서 예약해 둔 재고를
    실제 판매 재고로 확정한다.

    예:
    주문 생성 전
        stock = 17
        reserved = 1

    주문 생성 후 예약
        stock = 17
        reserved = 2

    결제 승인 후
        stock = 16
        reserved = 1
    """

    order_items = db.execute(
        text(
            """
            SELECT
                variant_id,
                SUM(quantity) AS quantity
            FROM order_items
            WHERE order_id = :order_id
              AND variant_id IS NOT NULL
            GROUP BY variant_id
            """
        ),
        {
            "order_id": order_id,
        },
    ).mappings().all()

    for item in order_items:
        inventory = db.execute(
            text(
                """
                SELECT
                    inventory_id,
                    stock_quantity,
                    reserved_quantity
                FROM inventories
                WHERE org_id = :org_id
                  AND variant_id = :variant_id
                FOR UPDATE
                """
            ),
            {
                "org_id": org_id,
                "variant_id": item["variant_id"],
            },
        ).mappings().first()

        if inventory is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="결제 확정에 필요한 재고 정보를 찾을 수 없습니다.",
            )

        quantity = int(item["quantity"])

        if inventory["stock_quantity"] < quantity:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="실제 재고 수량이 부족합니다.",
            )

        if inventory["reserved_quantity"] < quantity:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="예약된 재고 수량이 부족합니다.",
            )

        db.execute(
            text(
                """
                UPDATE inventories

                SET
                    stock_quantity =
                        stock_quantity - :quantity,

                    reserved_quantity =
                        reserved_quantity - :quantity

                WHERE inventory_id = :inventory_id
                """
            ),
            {
                "quantity": quantity,
                "inventory_id": inventory["inventory_id"],
            },
        )


def approve_customer_payment(
    db: Session,
    user_id: int,
    payment_id: int,
    approve_in: CustomerPaymentApproveRequest,
) -> CustomerPaymentResponse:
    """
    고객 결제 승인.

    현재 단계에서는 실제 Toss/Kakao API를 호출하는 것이 아니라
    PG 승인 결과를 전달받았다고 가정하고
    DB 내부의 결제 승인 흐름을 검증한다.

    실제 PG 연동 시 이 함수 내부의 승인 부분에
    PG 서버 API 호출을 연결하면 된다.
    """

    try:
        payment = db.execute(
            text(
                """
                SELECT
                    p.payment_id,
                    p.order_id,
                    p.payment_key,
                    p.payment_status,
                    p.requested_amount,
                    p.approved_amount,

                    o.order_no,
                    o.org_id,
                    o.order_status,
                    o.buyer_user_id

                FROM payments AS p

                INNER JOIN orders AS o
                    ON o.order_id = p.order_id

                WHERE p.payment_id = :payment_id
                  AND o.buyer_user_id = :user_id

                FOR UPDATE
                """
            ),
            {
                "payment_id": payment_id,
                "user_id": user_id,
            },
        ).mappings().first()

        if payment is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="결제 정보를 찾을 수 없습니다.",
            )

        requested_amount = Decimal(
            payment["requested_amount"]
        )

        approve_amount = Decimal(
            approve_in.amount
        )

        if approve_amount != requested_amount:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="결제 승인 금액이 주문 결제 금액과 일치하지 않습니다.",
            )

        if payment["payment_status"] == "DONE":
            if (
                Decimal(payment["approved_amount"])
                == approve_amount
                and payment["payment_key"]
                == approve_in.payment_key
            ):
                db.rollback()

                return get_customer_payment(
                    db=db,
                    user_id=user_id,
                    payment_id=payment_id,
                )

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="이미 완료된 결제입니다.",
            )

        if payment["payment_status"] != "READY":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="승인 가능한 결제 상태가 아닙니다.",
            )

        if payment["order_status"] != "PAYMENT_PENDING":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="결제 대기 상태의 주문이 아닙니다.",
            )

        _finalize_inventory(
            db=db,
            order_id=payment["order_id"],
            org_id=payment["org_id"],
        )

        db.execute(
            text(
                """
                UPDATE payments

                SET
                    payment_key = :payment_key,
                    payment_status = 'DONE',
                    approved_amount = :approved_amount,
                    balance_amount = 0,
                    receipt_url = :receipt_url,
                    approved_at = NOW()

                WHERE payment_id = :payment_id
                """
            ),
            {
                "payment_key": approve_in.payment_key,
                "approved_amount": approve_amount,
                "receipt_url": approve_in.receipt_url,
                "payment_id": payment_id,
            },
        )

        transaction_key = _generate_key(
            "approve"
        )

        idempotency_key = _generate_key(
            "idempotency"
        )

        db.execute(
            text(
                """
                INSERT INTO payment_transactions (
                    payment_id,
                    transaction_key,
                    transaction_type,
                    transaction_status,
                    transaction_amount,
                    pg_transaction_id,
                    idempotency_key
                )
                VALUES (
                    :payment_id,
                    :transaction_key,
                    :transaction_type,
                    :transaction_status,
                    :transaction_amount,
                    :pg_transaction_id,
                    :idempotency_key
                )
                """
            ),
            {
                "payment_id": payment_id,
                "transaction_key": transaction_key,
                "transaction_type": "APPROVE",
                "transaction_status": "SUCCESS",
                "transaction_amount": approve_amount,
                "pg_transaction_id": approve_in.pg_transaction_id,
                "idempotency_key": idempotency_key,
            },
        )

        db.execute(
            text(
                """
                UPDATE orders
                SET order_status = 'PAID'
                WHERE order_id = :order_id
                """
            ),
            {
                "order_id": payment["order_id"],
            },
        )

        db.commit()

    except HTTPException:
        db.rollback()
        raise

    except IntegrityError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 사용된 payment_key입니다.",
        ) from exc

    except SQLAlchemyError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="결제 승인 처리 중 데이터베이스 오류가 발생했습니다.",
        ) from exc

    return get_customer_payment(
        db=db,
        user_id=user_id,
        payment_id=payment_id,
    )


def get_customer_payment_status(
    db: Session,
    user_id: int,
    payment_id: int,
) -> CustomerPaymentStatusResponse:
    """
    고객 본인의 결제 상태와 주문 상태를 조회한다.
    """

    row = db.execute(
        text(
            """
            SELECT
                p.payment_id,
                p.order_id,
                p.payment_status,
                p.requested_amount,
                p.approved_amount,
                p.balance_amount,
                p.requested_at,
                p.approved_at,

                o.order_status

            FROM payments AS p

            INNER JOIN orders AS o
                ON o.order_id = p.order_id

            WHERE p.payment_id = :payment_id
              AND o.buyer_user_id = :user_id
            """
        ),
        {
            "payment_id": payment_id,
            "user_id": user_id,
        },
    ).mappings().first()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="결제 정보를 찾을 수 없습니다.",
        )

    return CustomerPaymentStatusResponse(
        payment_id=row["payment_id"],
        order_id=row["order_id"],
        payment_status=row["payment_status"],
        order_status=row["order_status"],
        requested_amount=row["requested_amount"],
        approved_amount=row["approved_amount"],
        balance_amount=row["balance_amount"],
        requested_at=row["requested_at"],
        approved_at=row["approved_at"],
    )