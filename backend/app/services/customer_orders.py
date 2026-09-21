from datetime import datetime
from decimal import Decimal
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.schemas.customer_orders import (
    CustomerOrderCreateRequest,
    CustomerOrderDetailResponse,
    CustomerOrderItemResponse,
    CustomerOrderListItemResponse,
    CustomerOrderListResponse,
    CustomerOrderStatusResponse,
)


DEFAULT_DISCOUNT_AMOUNT = Decimal("0.00")
DEFAULT_SHIPPING_AMOUNT = Decimal("0.00")


def _get_customer_address(
    db: Session,
    user_id: int,
    address_id: int,
):
    """
    주문에 사용할 고객 본인의 배송지를 조회한다.
    """

    address = db.execute(
        text(
            """
            SELECT
                address_id,
                user_id,
                receiver_name,
                receiver_phone,
                zipcode,
                address1,
                address2
            FROM user_addresses
            WHERE address_id = :address_id
              AND user_id = :user_id
            """
        ),
        {
            "address_id": address_id,
            "user_id": user_id,
        },
    ).mappings().first()

    if address is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="배송지를 찾을 수 없습니다.",
        )

    return address


def _get_order_product(
    db: Session,
    product_id: int,
    variant_id: int,
):
    """
    주문할 상품과 상품 옵션(SKU)을 조회한다.

    프론트가 보내는 가격은 사용하지 않고
    DB에 저장된 실제 상품 가격과 옵션 추가금액을 사용한다.
    """

    row = db.execute(
        text(
            """
            SELECT
                p.product_id,
                p.product_name,
                p.sale_price,
                p.product_status,

                pv.variant_id,
                pv.product_id AS variant_product_id,
                pv.sku_code,
                pv.additional_price,
                pv.active_yn

            FROM products AS p

            INNER JOIN product_variants AS pv
                ON pv.product_id = p.product_id

            WHERE p.product_id = :product_id
              AND pv.variant_id = :variant_id
            """
        ),
        {
            "product_id": product_id,
            "variant_id": variant_id,
        },
    ).mappings().first()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="상품 또는 상품 옵션을 찾을 수 없습니다.",
        )

    if row["product_status"] != "SALE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="현재 주문할 수 없는 상품입니다.",
        )

    if row["active_yn"] != "Y":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="현재 사용할 수 없는 상품 옵션입니다.",
        )

    return row


def _normalize_order_items(
    order_in: CustomerOrderCreateRequest,
) -> list[dict]:
    """
    동일한 상품/옵션이 여러 번 들어오면
    하나의 주문 항목으로 합친다.
    """

    normalized: dict[
        tuple[int, int],
        dict,
    ] = {}

    for item in order_in.items:
        key = (
            item.product_id,
            item.variant_id,
        )

        if key not in normalized:
            normalized[key] = {
                "product_id": item.product_id,
                "variant_id": item.variant_id,
                "quantity": item.quantity,
            }

        else:
            normalized[key]["quantity"] += item.quantity

        if normalized[key]["quantity"] > 100:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="동일 상품 옵션은 최대 100개까지 주문할 수 있습니다.",
            )

    return list(
        normalized.values()
    )


def _find_fulfillment_org(
    db: Session,
    prepared_items: list[dict],
) -> int:
    """
    org_id가 없는 기존 바로구매용 로직.

    주문에 포함된 모든 상품을 처리할 수 있는
    하나의 조직(org_id)을 자동으로 찾는다.

    기존 주문 방식과의 호환성을 위해 유지한다.
    """

    candidate_org_ids: set[int] | None = None

    for item in prepared_items:
        rows = db.execute(
            text(
                """
                SELECT org_id
                FROM inventories
                WHERE variant_id = :variant_id
                  AND (
                        stock_quantity
                        - reserved_quantity
                      ) >= :quantity
                ORDER BY org_id
                """
            ),
            {
                "variant_id": item["variant_id"],
                "quantity": item["quantity"],
            },
        ).scalars().all()

        current_org_ids = {
            int(org_id)
            for org_id in rows
        }

        if candidate_org_ids is None:
            candidate_org_ids = current_org_ids

        else:
            candidate_org_ids = (
                candidate_org_ids
                & current_org_ids
            )

        if not candidate_org_ids:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "현재 한 판매사에서 주문 상품 전체의 "
                    "재고를 확보할 수 없습니다."
                ),
            )

    if not candidate_org_ids:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="주문 가능한 재고가 없습니다.",
        )

    return min(candidate_org_ids)


def _validate_requested_org(
    db: Session,
    org_id: int,
) -> int:
    """
    장바구니에서 전달받은 판매사 org_id를 검증한다.

    조건:
    - 존재하는 조직
    - 활성 조직
    - 해당 조직에 ACTIVE 판매자 계정 존재
    - ACTIVE 판매자 프로필 존재
    """

    row = db.execute(
        text(
            """
            SELECT
                ou.org_id
            FROM org_units AS ou

            WHERE ou.org_id = :org_id
              AND ou.active_yn = 'Y'

              AND EXISTS (
                    SELECT 1

                    FROM users AS u

                    INNER JOIN seller_profiles AS sp
                        ON sp.user_id = u.user_id

                    WHERE u.org_id = ou.org_id
                      AND u.user_status = 'ACTIVE'
                      AND sp.seller_status = 'ACTIVE'
                )
            """
        ),
        {
            "org_id": org_id,
        },
    ).mappings().first()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="현재 주문에 사용할 수 없는 판매사입니다.",
        )

    return int(row["org_id"])


def _lock_and_check_inventory(
    db: Session,
    org_id: int,
    prepared_items: list[dict],
) -> None:
    """
    주문 생성 직전에 해당 판매사의 재고를 잠그고
    구매 가능한 수량이 충분한지 다시 확인한다.

    장바구니에서 재고를 예약하지 않기 때문에
    실제 주문 시점에 반드시 다시 검사한다.
    """

    for item in prepared_items:
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
                detail=(
                    "선택한 판매사에 해당 상품의 "
                    "재고 정보가 없습니다."
                ),
            )

        available_quantity = (
            inventory["stock_quantity"]
            - inventory["reserved_quantity"]
        )

        if available_quantity < item["quantity"]:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "선택한 판매사의 상품 재고가 부족합니다."
                ),
            )


def _reserve_inventory(
    db: Session,
    org_id: int,
    prepared_items: list[dict],
) -> None:
    """
    주문이 생성되면 주문 수량만큼
    inventories.reserved_quantity를 증가시킨다.

    실제 stock_quantity 차감은 결제 승인 단계에서 처리한다.
    """

    for item in prepared_items:
        db.execute(
            text(
                """
                UPDATE inventories

                SET reserved_quantity =
                    reserved_quantity + :quantity

                WHERE org_id = :org_id
                  AND variant_id = :variant_id
                """
            ),
            {
                "quantity": item["quantity"],
                "org_id": org_id,
                "variant_id": item["variant_id"],
            },
        )


def _generate_order_no() -> str:
    """
    주문번호 생성.

    예:
    ORD-20260918-A1B2C3D4
    """

    date_part = datetime.now().strftime(
        "%Y%m%d"
    )

    random_part = (
        uuid4()
        .hex[:8]
        .upper()
    )

    return (
        f"ORD-{date_part}-{random_part}"
    )


def create_customer_order(
    db: Session,
    user_id: int,
    order_in: CustomerOrderCreateRequest,
) -> CustomerOrderDetailResponse:
    """
    고객 주문 생성.

    org_id가 있는 경우:
    - 장바구니에서 선택한 판매사로 주문
    - 해당 판매사의 재고만 사용

    org_id가 없는 경우:
    - 기존 바로구매 방식
    - 백엔드가 주문 가능한 판매사를 자동 선택

    처리 순서:
    1. 고객 배송지 확인
    2. 상품/SKU 확인
    3. DB 가격으로 주문금액 계산
    4. 판매사(org_id) 결정
    5. 해당 판매사 재고 잠금 및 확인
    6. orders 생성
    7. order_items 생성
    8. reserved_quantity 증가
    9. PAYMENT_PENDING 상태로 주문 생성
    """

    address = _get_customer_address(
        db=db,
        user_id=user_id,
        address_id=order_in.address_id,
    )

    normalized_items = (
        _normalize_order_items(
            order_in=order_in,
        )
    )

    prepared_items: list[dict] = []

    product_amount = Decimal("0.00")

    for item in normalized_items:
        product = _get_order_product(
            db=db,
            product_id=item["product_id"],
            variant_id=item["variant_id"],
        )

        sale_price = Decimal(
            product["sale_price"]
        )

        additional_price = Decimal(
            product["additional_price"]
            or 0
        )

        unit_price = (
            sale_price
            + additional_price
        )

        quantity = item["quantity"]

        item_amount = (
            unit_price
            * quantity
        )

        product_amount += item_amount

        prepared_items.append(
            {
                "product_id": product[
                    "product_id"
                ],
                "variant_id": product[
                    "variant_id"
                ],
                "product_name": product[
                    "product_name"
                ],
                "sku_code": product[
                    "sku_code"
                ],
                "quantity": quantity,
                "unit_price": unit_price,
                "item_amount": item_amount,
            }
        )

    # 장바구니 주문이면 프론트가 선택한 판매사를 사용한다.
    if order_in.org_id is not None:
        org_id = _validate_requested_org(
            db=db,
            org_id=order_in.org_id,
        )

    # 기존 바로구매는 기존 방식대로 판매사를 자동 선택한다.
    else:
        org_id = _find_fulfillment_org(
            db=db,
            prepared_items=prepared_items,
        )

    discount_amount = (
        DEFAULT_DISCOUNT_AMOUNT
    )

    shipping_amount = (
        DEFAULT_SHIPPING_AMOUNT
    )

    total_amount = (
        product_amount
        - discount_amount
        + shipping_amount
    )

    order_no = _generate_order_no()

    try:
        _lock_and_check_inventory(
            db=db,
            org_id=org_id,
            prepared_items=prepared_items,
        )

        order_result = db.execute(
            text(
                """
                INSERT INTO orders (
                    order_no,
                    buyer_user_id,
                    org_id,
                    order_status,

                    product_amount,
                    discount_amount,
                    shipping_amount,
                    total_amount,

                    receiver_name,
                    receiver_phone,
                    zipcode,
                    shipping_address1,
                    shipping_address2
                )
                VALUES (
                    :order_no,
                    :buyer_user_id,
                    :org_id,
                    :order_status,

                    :product_amount,
                    :discount_amount,
                    :shipping_amount,
                    :total_amount,

                    :receiver_name,
                    :receiver_phone,
                    :zipcode,
                    :shipping_address1,
                    :shipping_address2
                )
                """
            ),
            {
                "order_no": order_no,
                "buyer_user_id": user_id,
                "org_id": org_id,
                "order_status": (
                    "PAYMENT_PENDING"
                ),

                "product_amount": (
                    product_amount
                ),
                "discount_amount": (
                    discount_amount
                ),
                "shipping_amount": (
                    shipping_amount
                ),
                "total_amount": total_amount,

                "receiver_name": address[
                    "receiver_name"
                ],
                "receiver_phone": address[
                    "receiver_phone"
                ],
                "zipcode": address[
                    "zipcode"
                ],
                "shipping_address1": address[
                    "address1"
                ],
                "shipping_address2": address[
                    "address2"
                ],
            },
        )

        order_id = (
            order_result.lastrowid
        )

        for item in prepared_items:
            db.execute(
                text(
                    """
                    INSERT INTO order_items (
                        order_id,
                        product_id,
                        variant_id,

                        product_name_snapshot,
                        sku_snapshot,

                        quantity,
                        unit_price,
                        item_amount,

                        item_status
                    )
                    VALUES (
                        :order_id,
                        :product_id,
                        :variant_id,

                        :product_name_snapshot,
                        :sku_snapshot,

                        :quantity,
                        :unit_price,
                        :item_amount,

                        :item_status
                    )
                    """
                ),
                {
                    "order_id": order_id,

                    "product_id": item[
                        "product_id"
                    ],
                    "variant_id": item[
                        "variant_id"
                    ],

                    "product_name_snapshot": (
                        item["product_name"]
                    ),
                    "sku_snapshot": item[
                        "sku_code"
                    ],

                    "quantity": item[
                        "quantity"
                    ],
                    "unit_price": item[
                        "unit_price"
                    ],
                    "item_amount": item[
                        "item_amount"
                    ],

                    "item_status": "ORDERED",
                },
            )

        _reserve_inventory(
            db=db,
            org_id=org_id,
            prepared_items=prepared_items,
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
                "주문 생성 중 데이터베이스 오류가 발생했습니다."
            ),
        ) from exc

    return get_customer_order_detail(
        db=db,
        user_id=user_id,
        order_id=order_id,
    )


def get_customer_orders(
    db: Session,
    user_id: int,
    page: int = 1,
    size: int = 20,
) -> CustomerOrderListResponse:
    """
    로그인한 고객의 주문 목록을 조회한다.
    """

    total = db.execute(
        text(
            """
            SELECT COUNT(*)
            FROM orders
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
                order_id,
                order_no,
                order_status,

                product_amount,
                discount_amount,
                shipping_amount,
                total_amount,

                ordered_at,
                updated_at

            FROM orders

            WHERE buyer_user_id = :user_id

            ORDER BY
                ordered_at DESC,
                order_id DESC

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
        CustomerOrderListItemResponse(
            order_id=row[
                "order_id"
            ],
            order_no=row[
                "order_no"
            ],
            order_status=row[
                "order_status"
            ],

            product_amount=row[
                "product_amount"
            ],
            discount_amount=row[
                "discount_amount"
            ],
            shipping_amount=row[
                "shipping_amount"
            ],
            total_amount=row[
                "total_amount"
            ],

            ordered_at=row[
                "ordered_at"
            ],
            updated_at=row[
                "updated_at"
            ],
        )
        for row in rows
    ]

    return CustomerOrderListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
    )


def get_customer_order_detail(
    db: Session,
    user_id: int,
    order_id: int,
) -> CustomerOrderDetailResponse:
    """
    로그인한 고객의 주문 상세를 조회한다.

    buyer_user_id까지 함께 확인해서
    본인의 주문만 조회할 수 있다.
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

                product_amount,
                discount_amount,
                shipping_amount,
                total_amount,

                receiver_name,
                receiver_phone,
                zipcode,
                shipping_address1,
                shipping_address2,

                ordered_at,
                updated_at

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

    item_rows = db.execute(
        text(
            """
            SELECT
                order_item_id,
                product_id,
                variant_id,

                product_name_snapshot,
                sku_snapshot,

                quantity,
                unit_price,
                item_amount,
                item_status

            FROM order_items

            WHERE order_id = :order_id

            ORDER BY order_item_id
            """
        ),
        {
            "order_id": order_id,
        },
    ).mappings().all()

    items = [
        CustomerOrderItemResponse(
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

            quantity=row[
                "quantity"
            ],

            unit_price=row[
                "unit_price"
            ],
            item_amount=row[
                "item_amount"
            ],

            item_status=row[
                "item_status"
            ],
        )
        for row in item_rows
    ]

    return CustomerOrderDetailResponse(
        order_id=order[
            "order_id"
        ],
        order_no=order[
            "order_no"
        ],

        buyer_user_id=order[
            "buyer_user_id"
        ],
        org_id=order[
            "org_id"
        ],

        order_status=order[
            "order_status"
        ],

        product_amount=order[
            "product_amount"
        ],
        discount_amount=order[
            "discount_amount"
        ],
        shipping_amount=order[
            "shipping_amount"
        ],
        total_amount=order[
            "total_amount"
        ],

        receiver_name=order[
            "receiver_name"
        ],
        receiver_phone=order[
            "receiver_phone"
        ],
        zipcode=order[
            "zipcode"
        ],

        shipping_address1=order[
            "shipping_address1"
        ],
        shipping_address2=order[
            "shipping_address2"
        ],

        ordered_at=order[
            "ordered_at"
        ],
        updated_at=order[
            "updated_at"
        ],

        items=items,
    )


def get_customer_order_status(
    db: Session,
    user_id: int,
    order_id: int,
) -> CustomerOrderStatusResponse:
    """
    로그인한 고객의 주문 상태를 조회한다.
    """

    order = db.execute(
        text(
            """
            SELECT
                order_id,
                order_no,
                order_status,
                ordered_at,
                updated_at

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

    return CustomerOrderStatusResponse(
        order_id=order[
            "order_id"
        ],
        order_no=order[
            "order_no"
        ],
        order_status=order[
            "order_status"
        ],
        ordered_at=order[
            "ordered_at"
        ],
        updated_at=order[
            "updated_at"
        ],
    )