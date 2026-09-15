from fastapi import HTTPException, status
from sqlalchemy import or_, text
from sqlalchemy.orm import Session

from app.models.products import (
    Category,
    Inventory,
    Product,
    ProductVariant,
)
from app.schemas.customer_products import (
    CustomerCategoryResponse,
    CustomerProductDetailResponse,
    CustomerProductImageResponse,
    CustomerProductListItem,
    CustomerProductListResponse,
    CustomerProductVariantResponse,
)


CUSTOMER_VISIBLE_PRODUCT_STATUSES = (
    "SALE",
    "SOLD_OUT",
)


def get_customer_categories(
    db: Session,
) -> list[CustomerCategoryResponse]:
    """
    고객 화면에 노출할 활성 카테고리 목록 조회.

    기존 categories 테이블에서
    active_yn='Y'인 카테고리만 보여준다.
    """

    categories = (
        db.query(Category)
        .filter(Category.active_yn == "Y")
        .order_by(
            Category.category_level,
            Category.display_order,
            Category.category_id,
        )
        .all()
    )

    return [
        CustomerCategoryResponse(
            category_id=category.category_id,
            parent_category_id=category.parent_category_id,
            category_name=category.category_name,
            category_level=category.category_level,
            display_order=category.display_order,
        )
        for category in categories
    ]


def _get_main_image_url(
    db: Session,
    product_id: int,
) -> str | None:
    """
    상품 목록에 사용할 대표 이미지 URL 조회.

    기존:
    product_images
        ↓
    file_assets

    두 테이블을 연결해서 활성 이미지/파일만 조회한다.

    이미지 우선순위:
    1. MAIN
    2. THUMBNAIL
    3. DETAIL
    4. OPTION
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


def get_customer_products(
    db: Session,
    page: int = 1,
    size: int = 20,
    category_id: int | None = None,
    keyword: str | None = None,
) -> CustomerProductListResponse:
    """
    고객 상품 목록 / 검색.

    고객 화면에는:
    - SALE
    - SOLD_OUT

    상태의 상품만 노출한다.

    READY / STOPPED / DELETED 상품은
    고객에게 노출하지 않는다.
    """

    query = (
        db.query(
            Product,
            Category.category_name,
        )
        .join(
            Category,
            Product.category_id == Category.category_id,
        )
        .filter(
            Product.product_status.in_(
                CUSTOMER_VISIBLE_PRODUCT_STATUSES
            ),
            Category.active_yn == "Y",
        )
    )

    # 카테고리 필터
    if category_id is not None:
        query = query.filter(
            Product.category_id == category_id
        )

    # 상품 검색
    if keyword:
        cleaned_keyword = keyword.strip()

        if cleaned_keyword:
            search_keyword = f"%{cleaned_keyword}%"

            query = query.filter(
                or_(
                    Product.product_name.like(
                        search_keyword
                    ),
                    Product.product_code.like(
                        search_keyword
                    ),
                    Product.short_description.like(
                        search_keyword
                    ),
                )
            )

    total = query.count()

    rows = (
        query
        .order_by(
            Product.product_id.desc()
        )
        .offset(
            (page - 1) * size
        )
        .limit(size)
        .all()
    )

    items: list[CustomerProductListItem] = []

    for product, category_name in rows:
        items.append(
            CustomerProductListItem(
                product_id=product.product_id,
                category_id=product.category_id,
                category_name=category_name,
                product_code=product.product_code,
                product_name=product.product_name,
                short_description=(
                    product.short_description
                ),
                regular_price=product.regular_price,
                sale_price=product.sale_price,
                product_status=product.product_status,
                main_image_url=_get_main_image_url(
                    db=db,
                    product_id=product.product_id,
                ),
            )
        )

    return CustomerProductListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
    )


def _get_product_images(
    db: Session,
    product_id: int,
) -> list[CustomerProductImageResponse]:
    """
    상품 상세 페이지 이미지 목록 조회.

    product_images와 file_assets를 연결해서
    활성 이미지와 활성 파일만 반환한다.
    """

    rows = db.execute(
        text(
            """
            SELECT
                pi.product_image_id,
                pi.file_id,
                pi.image_type,
                pi.alt_text,
                pi.display_order,
                fa.public_url,
                fa.thumbnail_url
            FROM product_images AS pi
            INNER JOIN file_assets AS fa
                ON fa.file_id = pi.file_id
            WHERE pi.product_id = :product_id
              AND pi.active_yn = 'Y'
              AND fa.active_yn = 'Y'
            ORDER BY
                pi.display_order,
                pi.product_image_id
            """
        ),
        {
            "product_id": product_id,
        },
    ).mappings().all()

    return [
        CustomerProductImageResponse(
            product_image_id=row[
                "product_image_id"
            ],
            file_id=row["file_id"],
            image_type=row["image_type"],
            alt_text=row["alt_text"],
            display_order=row["display_order"],
            public_url=row["public_url"],
            thumbnail_url=row["thumbnail_url"],
        )
        for row in rows
    ]


def _get_available_quantity_by_variant(
    db: Session,
    variant_ids: list[int],
) -> dict[int, int]:
    """
    각 SKU별 고객 구매 가능 수량 계산.

    기존 inventories 테이블의:

    stock_quantity
    reserved_quantity

    를 이용한다.

    각 재고 행별:
    stock_quantity - reserved_quantity

    값이 0보다 작으면 0으로 처리한 뒤
    여러 조직의 재고를 합산한다.
    """

    if not variant_ids:
        return {}

    inventories = (
        db.query(Inventory)
        .filter(
            Inventory.variant_id.in_(
                variant_ids
            )
        )
        .all()
    )

    quantities: dict[int, int] = {
        variant_id: 0
        for variant_id in variant_ids
    }

    for inventory in inventories:
        available = (
            inventory.stock_quantity
            - inventory.reserved_quantity
        )

        if available < 0:
            available = 0

        quantities[inventory.variant_id] = (
            quantities.get(
                inventory.variant_id,
                0,
            )
            + available
        )

    return quantities


def _get_product_variants(
    db: Session,
    product_id: int,
) -> list[CustomerProductVariantResponse]:
    """
    고객이 선택할 수 있는 활성 SKU 목록 조회.
    """

    variants = (
        db.query(ProductVariant)
        .filter(
            ProductVariant.product_id
            == product_id,
            ProductVariant.active_yn == "Y",
        )
        .order_by(
            ProductVariant.variant_id
        )
        .all()
    )

    variant_ids = [
        variant.variant_id
        for variant in variants
    ]

    quantity_map = (
        _get_available_quantity_by_variant(
            db=db,
            variant_ids=variant_ids,
        )
    )

    return [
        CustomerProductVariantResponse(
            variant_id=variant.variant_id,
            sku_code=variant.sku_code,
            option_name1=variant.option_name1,
            option_value1=variant.option_value1,
            option_name2=variant.option_name2,
            option_value2=variant.option_value2,
            additional_price=(
                variant.additional_price
            ),
            available_quantity=(
                quantity_map.get(
                    variant.variant_id,
                    0,
                )
            ),
        )
        for variant in variants
    ]


def get_customer_product_detail(
    db: Session,
    product_id: int,
) -> CustomerProductDetailResponse:
    """
    고객 상품 상세 조회.

    고객에게 노출 가능한 상품만 조회한다.

    함께 반환:
    - 상품 기본 정보
    - 카테고리
    - 상품 이미지
    - SKU 옵션
    - 옵션별 구매 가능 재고
    """

    row = (
        db.query(
            Product,
            Category.category_name,
        )
        .join(
            Category,
            Product.category_id
            == Category.category_id,
        )
        .filter(
            Product.product_id
            == product_id,
            Product.product_status.in_(
                CUSTOMER_VISIBLE_PRODUCT_STATUSES
            ),
            Category.active_yn == "Y",
        )
        .first()
    )

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="판매 중인 상품을 찾을 수 없습니다.",
        )

    product, category_name = row

    images = _get_product_images(
        db=db,
        product_id=product.product_id,
    )

    variants = _get_product_variants(
        db=db,
        product_id=product.product_id,
    )

    return CustomerProductDetailResponse(
        product_id=product.product_id,
        category_id=product.category_id,
        category_name=category_name,
        product_code=product.product_code,
        product_name=product.product_name,
        short_description=(
            product.short_description
        ),
        description=product.description,
        regular_price=product.regular_price,
        sale_price=product.sale_price,
        product_status=product.product_status,
        created_at=product.created_at,
        updated_at=product.updated_at,
        images=images,
        variants=variants,
    )