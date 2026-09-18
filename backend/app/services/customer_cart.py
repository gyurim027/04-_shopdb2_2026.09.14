from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.schemas.customer_cart import (
    CustomerCartItemAddRequest,
    CustomerCartItemQuantityUpdateRequest,
    CustomerCartItemResponse,
    CustomerCartItemSelectedUpdateRequest,
    CustomerCartResponse,
)


MAX_CART_ITEM_QUANTITY = 100


def _get_cart(
    db: Session,
    user_id: int,
):
    """
    로그인한 고객의 장바구니를 조회한다.

    고객 한 명당 현재 장바구니 하나만 사용한다.
    """

    return db.execute(
        text(
            """
            SELECT
                cart_id,
                buyer_user_id,
                created_at,
                updated_at
            FROM carts
            WHERE buyer_user_id = :user_id
            """
        ),
        {
            "user_id": user_id,
        },
    ).mappings().first()


def _get_or_create_cart(
    db: Session,
    user_id: int,
) -> int:
    """
    고객의 장바구니가 있으면 기존 cart_id를 반환하고,
    없으면 새 장바구니를 생성한다.
    """

    cart = _get_cart(
        db=db,
        user_id=user_id,
    )

    if cart is not None:
        return int(cart["cart_id"])

    result = db.execute(
        text(
            """
            INSERT INTO carts (
                buyer_user_id
            )
            VALUES (
                :buyer_user_id
            )
            """
        ),
        {
            "buyer_user_id": user_id,
        },
    )

    return int(result.lastrowid)


def _get_variant_for_cart(
    db: Session,
    org_id: int,
    variant_id: int,
):
    """
    장바구니에 담으려는 판매사와 상품 옵션을 확인한다.

    확인 사항:
    - 해당 org_id가 실제 존재하는 조직인지
    - 활성 조직인지
    - 해당 조직에 활성 판매자가 있는지
    - 해당 조직이 실제 해당 variant 재고를 가지고 있는지
    - 상품 상태가 SALE인지
    - 상품 옵션이 활성화 상태인지
    """

    row = db.execute(
        text(
            """
            SELECT
                ou.org_id,
                ou.org_name,
                ou.active_yn AS org_active_yn,

                p.product_id,
                p.product_name,
                p.sale_price,
                p.product_status,

                pv.variant_id,
                pv.sku_code,
                pv.option_name1,
                pv.option_value1,
                pv.option_name2,
                pv.option_value2,
                pv.additional_price,
                pv.active_yn AS variant_active_yn,

                (
                    SELECT sp.company_name
                    FROM seller_profiles AS sp

                    INNER JOIN users AS seller_user
                        ON seller_user.user_id = sp.user_id

                    WHERE seller_user.org_id = ou.org_id
                      AND seller_user.user_status = 'ACTIVE'
                      AND sp.seller_status = 'ACTIVE'

                    ORDER BY sp.seller_id

                    LIMIT 1
                ) AS seller_name

            FROM inventories AS i

            INNER JOIN org_units AS ou
                ON ou.org_id = i.org_id

            INNER JOIN product_variants AS pv
                ON pv.variant_id = i.variant_id

            INNER JOIN products AS p
                ON p.product_id = pv.product_id

            WHERE i.org_id = :org_id
              AND i.variant_id = :variant_id

            LIMIT 1
            """
        ),
        {
            "org_id": org_id,
            "variant_id": variant_id,
        },
    ).mappings().first()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 판매사에서 판매 중인 상품 옵션을 찾을 수 없습니다.",
        )

    if row["org_active_yn"] != "Y":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="현재 이용할 수 없는 판매사입니다.",
        )

    if row["seller_name"] is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="현재 판매 가능한 판매사 정보가 없습니다.",
        )

    if row["product_status"] != "SALE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="현재 장바구니에 담을 수 없는 상품입니다.",
        )

    if row["variant_active_yn"] != "Y":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="현재 사용할 수 없는 상품 옵션입니다.",
        )

    return row


def _get_available_quantity(
    db: Session,
    org_id: int,
    variant_id: int,
) -> int:
    """
    특정 판매사(org_id)의 특정 상품 옵션 재고를 계산한다.

    구매 가능 재고 =
    stock_quantity - reserved_quantity

    장바구니에 담는 것만으로는
    reserved_quantity를 증가시키지 않는다.
    """

    available_quantity = db.execute(
        text(
            """
            SELECT
                COALESCE(
                    SUM(
                        GREATEST(
                            stock_quantity - reserved_quantity,
                            0
                        )
                    ),
                    0
                )
            FROM inventories
            WHERE org_id = :org_id
              AND variant_id = :variant_id
            """
        ),
        {
            "org_id": org_id,
            "variant_id": variant_id,
        },
    ).scalar_one()

    return int(available_quantity or 0)


def _get_owned_cart_item(
    db: Session,
    user_id: int,
    cart_item_id: int,
):
    """
    로그인한 고객 소유의 장바구니 상품인지 확인한다.

    다른 고객의 cart_item_id를 사용해
    수정하거나 삭제할 수 없도록 한다.
    """

    row = db.execute(
        text(
            """
            SELECT
                ci.cart_item_id,
                ci.cart_id,
                ci.org_id,
                ci.variant_id,
                ci.quantity,
                ci.selected_yn,
                ci.added_at,
                ci.updated_at,

                c.buyer_user_id

            FROM cart_items AS ci

            INNER JOIN carts AS c
                ON c.cart_id = ci.cart_id

            WHERE ci.cart_item_id = :cart_item_id
              AND c.buyer_user_id = :user_id
            """
        ),
        {
            "cart_item_id": cart_item_id,
            "user_id": user_id,
        },
    ).mappings().first()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="장바구니 상품을 찾을 수 없습니다.",
        )

    return row


def _get_main_image_url(
    db: Session,
    product_id: int,
) -> str | None:
    """
    상품 대표 이미지 URL을 조회한다.

    우선순위:
    MAIN
    THUMBNAIL
    DETAIL
    OPTION
    """

    row = db.execute(
        text(
            """
            SELECT
                fa.public_url,
                fa.thumbnail_url

            FROM product_images AS pi

            INNER JOIN file_assets AS fa
                ON fa.file_id = pi.file_id

            WHERE pi.product_id = :product_id
              AND pi.active_yn = 'Y'
              AND fa.active_yn = 'Y'

            ORDER BY
                CASE pi.image_type
                    WHEN 'MAIN' THEN 1
                    WHEN 'THUMBNAIL' THEN 2
                    WHEN 'DETAIL' THEN 3
                    WHEN 'OPTION' THEN 4
                    ELSE 5
                END,
                pi.display_order,
                pi.product_image_id

            LIMIT 1
            """
        ),
        {
            "product_id": product_id,
        },
    ).mappings().first()

    if row is None:
        return None

    return (
        row["public_url"]
        or row["thumbnail_url"]
    )


def add_customer_cart_item(
    db: Session,
    user_id: int,
    item_in: CustomerCartItemAddRequest,
) -> CustomerCartResponse:
    """
    판매사와 상품 옵션을 지정해서 장바구니에 상품을 추가한다.

    같은:
    cart_id + org_id + variant_id

    조합이 이미 존재하면 새로운 행을 만들지 않고
    기존 장바구니 상품 수량을 증가시킨다.

    같은 variant_id라도 org_id가 다르면
    서로 다른 장바구니 상품으로 저장된다.
    """

    product = _get_variant_for_cart(
        db=db,
        org_id=item_in.org_id,
        variant_id=item_in.variant_id,
    )

    available_quantity = _get_available_quantity(
        db=db,
        org_id=item_in.org_id,
        variant_id=item_in.variant_id,
    )

    if available_quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="현재 해당 판매사의 상품 재고가 없습니다.",
        )

    try:
        cart_id = _get_or_create_cart(
            db=db,
            user_id=user_id,
        )

        existing_item = db.execute(
            text(
                """
                SELECT
                    cart_item_id,
                    quantity
                FROM cart_items
                WHERE cart_id = :cart_id
                  AND org_id = :org_id
                  AND variant_id = :variant_id
                """
            ),
            {
                "cart_id": cart_id,
                "org_id": item_in.org_id,
                "variant_id": item_in.variant_id,
            },
        ).mappings().first()

        if existing_item is None:
            new_quantity = item_in.quantity

            if new_quantity > available_quantity:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="현재 해당 판매사의 구매 가능 재고 수량을 초과했습니다.",
                )

            db.execute(
                text(
                    """
                    INSERT INTO cart_items (
                        cart_id,
                        org_id,
                        variant_id,
                        quantity,
                        selected_yn
                    )
                    VALUES (
                        :cart_id,
                        :org_id,
                        :variant_id,
                        :quantity,
                        'Y'
                    )
                    """
                ),
                {
                    "cart_id": cart_id,
                    "org_id": product["org_id"],
                    "variant_id": product["variant_id"],
                    "quantity": new_quantity,
                },
            )

        else:
            new_quantity = (
                int(existing_item["quantity"])
                + item_in.quantity
            )

            if new_quantity > MAX_CART_ITEM_QUANTITY:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="같은 판매사의 같은 상품 옵션은 최대 100개까지 장바구니에 담을 수 있습니다.",
                )

            if new_quantity > available_quantity:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="현재 해당 판매사의 구매 가능 재고 수량을 초과했습니다.",
                )

            db.execute(
                text(
                    """
                    UPDATE cart_items
                    SET
                        quantity = :quantity,
                        selected_yn = 'Y'
                    WHERE cart_item_id = :cart_item_id
                    """
                ),
                {
                    "quantity": new_quantity,
                    "cart_item_id": existing_item[
                        "cart_item_id"
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
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="장바구니 상품 추가 중 데이터베이스 오류가 발생했습니다.",
        ) from exc

    return get_customer_cart(
        db=db,
        user_id=user_id,
    )


def get_customer_cart(
    db: Session,
    user_id: int,
) -> CustomerCartResponse:
    """
    로그인한 고객의 현재 장바구니를 조회한다.

    응답에 org_id, org_name, seller_name을 포함하므로
    프론트에서는 org_id 기준으로 판매사별 그룹을 만들 수 있다.

    장바구니가 아직 없으면
    빈 장바구니 응답만 반환한다.
    """

    cart = _get_cart(
        db=db,
        user_id=user_id,
    )

    if cart is None:
        return CustomerCartResponse(
            cart_id=None,
            buyer_user_id=user_id,
            items=[],
            total_item_count=0,
            selected_item_count=0,
            total_quantity=0,
            selected_quantity=0,
            total_amount=Decimal("0.00"),
            selected_amount=Decimal("0.00"),
        )

    rows = db.execute(
        text(
            """
            SELECT
                ci.cart_item_id,
                ci.org_id,
                ci.variant_id,
                ci.quantity,
                ci.selected_yn,
                ci.added_at,
                ci.updated_at,

                ou.org_name,

                (
                    SELECT sp.company_name
                    FROM seller_profiles AS sp

                    INNER JOIN users AS seller_user
                        ON seller_user.user_id = sp.user_id

                    WHERE seller_user.org_id = ci.org_id

                    ORDER BY
                        CASE
                            WHEN sp.seller_status = 'ACTIVE'
                            THEN 0
                            ELSE 1
                        END,
                        sp.seller_id

                    LIMIT 1
                ) AS seller_name,

                p.product_id,
                p.product_name,
                p.sale_price,
                p.product_status,

                pv.sku_code,
                pv.option_name1,
                pv.option_value1,
                pv.option_name2,
                pv.option_value2,
                pv.additional_price,
                pv.active_yn AS variant_active_yn

            FROM cart_items AS ci

            INNER JOIN org_units AS ou
                ON ou.org_id = ci.org_id

            INNER JOIN product_variants AS pv
                ON pv.variant_id = ci.variant_id

            INNER JOIN products AS p
                ON p.product_id = pv.product_id

            WHERE ci.cart_id = :cart_id

            ORDER BY
                ci.org_id,
                ci.added_at DESC,
                ci.cart_item_id DESC
            """
        ),
        {
            "cart_id": cart["cart_id"],
        },
    ).mappings().all()

    items: list[CustomerCartItemResponse] = []

    total_quantity = 0
    selected_quantity = 0

    total_amount = Decimal("0.00")
    selected_amount = Decimal("0.00")

    selected_item_count = 0

    for row in rows:
        sale_price = Decimal(
            row["sale_price"]
            or 0
        )

        additional_price = Decimal(
            row["additional_price"]
            or 0
        )

        unit_price = (
            sale_price
            + additional_price
        )

        quantity = int(
            row["quantity"]
        )

        item_amount = (
            unit_price
            * quantity
        )

        available_quantity = (
            _get_available_quantity(
                db=db,
                org_id=row["org_id"],
                variant_id=row["variant_id"],
            )
        )

        selected_yn = row["selected_yn"]

        total_quantity += quantity
        total_amount += item_amount

        if selected_yn == "Y":
            selected_item_count += 1
            selected_quantity += quantity
            selected_amount += item_amount

        items.append(
            CustomerCartItemResponse(
                cart_item_id=row[
                    "cart_item_id"
                ],

                org_id=row[
                    "org_id"
                ],
                org_name=row[
                    "org_name"
                ],
                seller_name=row[
                    "seller_name"
                ],

                product_id=row[
                    "product_id"
                ],
                variant_id=row[
                    "variant_id"
                ],

                product_name=row[
                    "product_name"
                ],
                sku_code=row[
                    "sku_code"
                ],

                option_name1=row[
                    "option_name1"
                ],
                option_value1=row[
                    "option_value1"
                ],

                option_name2=row[
                    "option_name2"
                ],
                option_value2=row[
                    "option_value2"
                ],

                sale_price=sale_price,
                additional_price=additional_price,
                unit_price=unit_price,

                quantity=quantity,
                item_amount=item_amount,

                selected_yn=selected_yn,

                available_quantity=(
                    available_quantity
                ),

                product_status=row[
                    "product_status"
                ],
                variant_active_yn=row[
                    "variant_active_yn"
                ],

                main_image_url=(
                    _get_main_image_url(
                        db=db,
                        product_id=row[
                            "product_id"
                        ],
                    )
                ),

                added_at=row[
                    "added_at"
                ],
                updated_at=row[
                    "updated_at"
                ],
            )
        )

    return CustomerCartResponse(
        cart_id=cart["cart_id"],
        buyer_user_id=user_id,

        items=items,

        total_item_count=len(items),
        selected_item_count=selected_item_count,

        total_quantity=total_quantity,
        selected_quantity=selected_quantity,

        total_amount=total_amount,
        selected_amount=selected_amount,
    )


def update_customer_cart_item_quantity(
    db: Session,
    user_id: int,
    cart_item_id: int,
    item_in: CustomerCartItemQuantityUpdateRequest,
) -> CustomerCartResponse:
    """
    장바구니 상품 수량을 변경한다.

    해당 장바구니 상품에 저장된
    org_id + variant_id 기준으로 재고를 확인한다.
    """

    cart_item = _get_owned_cart_item(
        db=db,
        user_id=user_id,
        cart_item_id=cart_item_id,
    )

    _get_variant_for_cart(
        db=db,
        org_id=cart_item["org_id"],
        variant_id=cart_item["variant_id"],
    )

    available_quantity = _get_available_quantity(
        db=db,
        org_id=cart_item["org_id"],
        variant_id=cart_item["variant_id"],
    )

    if item_in.quantity > available_quantity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="현재 해당 판매사의 구매 가능 재고 수량을 초과했습니다.",
        )

    try:
        db.execute(
            text(
                """
                UPDATE cart_items
                SET quantity = :quantity
                WHERE cart_item_id = :cart_item_id
                """
            ),
            {
                "quantity": item_in.quantity,
                "cart_item_id": cart_item_id,
            },
        )

        db.commit()

    except SQLAlchemyError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="장바구니 수량 변경 중 데이터베이스 오류가 발생했습니다.",
        ) from exc

    return get_customer_cart(
        db=db,
        user_id=user_id,
    )


def update_customer_cart_item_selected(
    db: Session,
    user_id: int,
    cart_item_id: int,
    item_in: CustomerCartItemSelectedUpdateRequest,
) -> CustomerCartResponse:
    """
    장바구니 상품의 주문 선택 여부를 변경한다.

    Y = 이번 주문에 포함
    N = 장바구니에는 남기고 이번 주문에서는 제외
    """

    _get_owned_cart_item(
        db=db,
        user_id=user_id,
        cart_item_id=cart_item_id,
    )

    try:
        db.execute(
            text(
                """
                UPDATE cart_items
                SET selected_yn = :selected_yn
                WHERE cart_item_id = :cart_item_id
                """
            ),
            {
                "selected_yn": item_in.selected_yn,
                "cart_item_id": cart_item_id,
            },
        )

        db.commit()

    except SQLAlchemyError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="장바구니 선택 상태 변경 중 데이터베이스 오류가 발생했습니다.",
        ) from exc

    return get_customer_cart(
        db=db,
        user_id=user_id,
    )


def delete_customer_cart_item(
    db: Session,
    user_id: int,
    cart_item_id: int,
) -> CustomerCartResponse:
    """
    장바구니에서 상품 한 건을 삭제한다.
    """

    _get_owned_cart_item(
        db=db,
        user_id=user_id,
        cart_item_id=cart_item_id,
    )

    try:
        db.execute(
            text(
                """
                DELETE FROM cart_items
                WHERE cart_item_id = :cart_item_id
                """
            ),
            {
                "cart_item_id": cart_item_id,
            },
        )

        db.commit()

    except SQLAlchemyError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="장바구니 상품 삭제 중 데이터베이스 오류가 발생했습니다.",
        ) from exc

    return get_customer_cart(
        db=db,
        user_id=user_id,
    )