"""Service layer for seller_products (categories 조회, products, variants, images, files, 판매실적)."""

from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.dependencies.auth import AuthContext
from app.models.products import (
    Category,
    Product,
    ProductFile,
    ProductImage,
    ProductVariant,
)

# 셀러 소유권 스코프는 어드민의 org 트리 스코프와 달리 단순하다:
# products.seller_user_id == auth.user_id 인 상품만 본인 소유로 취급한다.


def _not_found(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


# --- Categories (읽기 전용) --------------------------------------------------


def list_categories(db: Session) -> list[Category]:
    return list(
        db.query(Category)
        .filter(Category.active_yn == "Y")
        .order_by(Category.category_level, Category.display_order)
        .all()
    )


# --- Products ------------------------------------------------------------
# products 테이블엔 active_yn이 없어서 삭제 대신 product_status를 PATCH로
# STOPPED/DELETED로 바꾸는 방식만 제공한다 (별도 DELETE 엔드포인트 없음, 어드민과 동일).


def list_products(
    db: Session,
    auth: AuthContext,
    page: int = 1,
    size: int = 20,
    product_status: str | None = None,
    keyword: str | None = None,
) -> tuple[list[Product], int]:
    query = db.query(Product).filter(Product.seller_user_id == auth.user_id)
    if product_status is not None:
        query = query.filter(Product.product_status == product_status)
    if keyword:
        query = query.filter(Product.product_name.like(f"%{keyword}%"))
    total = query.count()
    items = (
        query.order_by(Product.updated_at.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )
    return list(items), total


def get_product(db: Session, product_id: int, auth: AuthContext) -> Product:
    product = (
        db.query(Product)
        .filter(Product.product_id == product_id, Product.seller_user_id == auth.user_id)
        .first()
    )
    if product is None:
        raise _not_found("상품을 찾을 수 없습니다.")
    return product


def create_product(db: Session, data: dict, auth: AuthContext) -> Product:
    product = Product(**data, seller_user_id=auth.user_id)
    db.add(product)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="이미 존재하는 상품코드입니다."
        ) from exc
    db.refresh(product)
    return product


def update_product(db: Session, product_id: int, data: dict, auth: AuthContext) -> Product:
    product = get_product(db, product_id, auth)
    for key, value in data.items():
        if value is not None:
            setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return product


# --- Product variants (SKU) ----------------------------------------------


def list_variants(db: Session, product_id: int, auth: AuthContext) -> list[ProductVariant]:
    get_product(db, product_id, auth)  # 존재 + 소유권 확인
    return list(
        db.query(ProductVariant)
        .filter(ProductVariant.product_id == product_id)
        .order_by(ProductVariant.variant_id)
        .all()
    )


def _get_owned_variant(db: Session, variant_id: int, auth: AuthContext) -> ProductVariant:
    variant = db.get(ProductVariant, variant_id)
    if variant is None:
        raise _not_found("옵션(SKU)을 찾을 수 없습니다.")
    get_product(db, variant.product_id, auth)  # 부모 상품 소유권 확인
    return variant


def create_variant(
    db: Session, product_id: int, data: dict, auth: AuthContext
) -> ProductVariant:
    get_product(db, product_id, auth)
    variant = ProductVariant(product_id=product_id, **data)
    db.add(variant)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="이미 존재하는 SKU 코드입니다."
        ) from exc
    db.refresh(variant)
    return variant


def update_variant(
    db: Session, variant_id: int, data: dict, auth: AuthContext
) -> ProductVariant:
    variant = _get_owned_variant(db, variant_id, auth)
    for key, value in data.items():
        if value is not None:
            setattr(variant, key, value)
    db.commit()
    db.refresh(variant)
    return variant


def deactivate_variant(db: Session, variant_id: int, auth: AuthContext) -> None:
    """실제 삭제가 아니라 active_yn='N' 처리 (소프트 삭제)."""
    variant = _get_owned_variant(db, variant_id, auth)
    variant.active_yn = "N"
    db.commit()


# --- Product images --------------------------------------------------------


def list_images(db: Session, product_id: int, auth: AuthContext) -> list[ProductImage]:
    get_product(db, product_id, auth)
    return list(
        db.query(ProductImage)
        .filter(ProductImage.product_id == product_id)
        .order_by(ProductImage.display_order)
        .all()
    )


def _get_owned_image(db: Session, product_image_id: int, auth: AuthContext) -> ProductImage:
    image = db.get(ProductImage, product_image_id)
    if image is None:
        raise _not_found("상품 이미지를 찾을 수 없습니다.")
    get_product(db, image.product_id, auth)
    return image


def create_image(db: Session, product_id: int, data: dict, auth: AuthContext) -> ProductImage:
    get_product(db, product_id, auth)
    image = ProductImage(product_id=product_id, **data)
    db.add(image)
    db.commit()
    db.refresh(image)
    return image


def update_image(
    db: Session, product_image_id: int, data: dict, auth: AuthContext
) -> ProductImage:
    image = _get_owned_image(db, product_image_id, auth)
    for key, value in data.items():
        if value is not None:
            setattr(image, key, value)
    db.commit()
    db.refresh(image)
    return image


def deactivate_image(db: Session, product_image_id: int, auth: AuthContext) -> None:
    """실제 삭제가 아니라 active_yn='N' 처리 (소프트 삭제)."""
    image = _get_owned_image(db, product_image_id, auth)
    image.active_yn = "N"
    db.commit()


# --- Product files (첨부파일) ------------------------------------------------
# active_yn 컬럼이 없어 삭제는 소프트 삭제가 아니라 실제 DELETE로 처리한다.


def list_files(db: Session, product_id: int, auth: AuthContext) -> list[ProductFile]:
    get_product(db, product_id, auth)
    return list(
        db.query(ProductFile)
        .filter(ProductFile.product_id == product_id)
        .order_by(ProductFile.display_order)
        .all()
    )


def _get_owned_file(db: Session, product_file_id: int, auth: AuthContext) -> ProductFile:
    file_row = db.get(ProductFile, product_file_id)
    if file_row is None:
        raise _not_found("상품 첨부파일을 찾을 수 없습니다.")
    get_product(db, file_row.product_id, auth)
    return file_row


def create_file(db: Session, product_id: int, data: dict, auth: AuthContext) -> ProductFile:
    get_product(db, product_id, auth)
    file_row = ProductFile(product_id=product_id, **data)
    db.add(file_row)
    db.commit()
    db.refresh(file_row)
    return file_row


def update_file(
    db: Session, product_file_id: int, data: dict, auth: AuthContext
) -> ProductFile:
    file_row = _get_owned_file(db, product_file_id, auth)
    for key, value in data.items():
        if value is not None:
            setattr(file_row, key, value)
    db.commit()
    db.refresh(file_row)
    return file_row


def delete_file(db: Session, product_file_id: int, auth: AuthContext) -> None:
    file_row = _get_owned_file(db, product_file_id, auth)
    db.delete(file_row)
    db.commit()


# --- 상품별 판매실적 (S-PROD-09) ---------------------------------------------
# orders/order_items는 명현님 소유 도메인이라 ORM 모델을 신뢰하지 않고
# 실제 컬럼명 기준 raw SQL로 직접 조회한다 (admin_refunds.py와 동일한 패턴).


def list_product_sales(db: Session, auth: AuthContext) -> list[dict]:
    rows = db.execute(
        text(
            """
            SELECT
                p.product_id,
                p.product_name,
                COALESCE(SUM(oi.quantity), 0) AS sold_quantity,
                COALESCE(SUM(oi.item_amount), 0) AS sold_amount
            FROM products p
            LEFT JOIN order_items oi ON oi.product_id = p.product_id
            WHERE p.seller_user_id = :seller_user_id
            GROUP BY p.product_id, p.product_name
            ORDER BY sold_amount DESC
            """
        ),
        {"seller_user_id": auth.user_id},
    ).all()
    return [
        {
            "product_id": row.product_id,
            "product_name": row.product_name,
            "sold_quantity": int(row.sold_quantity),
            "sold_amount": Decimal(row.sold_amount),
        }
        for row in rows
    ]
