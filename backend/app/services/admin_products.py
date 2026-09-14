"""Service layer for admin_products (categories, products, variants, images, files, inventories)."""

from fastapi import HTTPException, status
from sqlalchemy import bindparam, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.dependencies.auth import AuthContext
from app.models.products import Category, Product, ProductVariant


def get_org_type(db: Session, org_id: int | None) -> str | None:
    if org_id is None:
        return None
    row = db.execute(
        text("SELECT org_type FROM org_units WHERE org_id = :org_id"),
        {"org_id": org_id},
    ).first()
    return row[0] if row else None


def is_super_admin(db: Session, auth: AuthContext) -> bool:
    return get_org_type(db, auth.org_id) == "HEADQUARTER"


def require_super_admin(db: Session, auth: AuthContext) -> None:
    """04_관리자권한매트릭스: categories는 전역 자산이라 쓰기 권한은 최고관리자(HQ)만."""
    if not is_super_admin(db, auth):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="최고관리자만 카테고리를 등록/수정/삭제할 수 있습니다.",
        )


# --- Categories --------------------------------------------------------


def list_categories(db: Session) -> list[Category]:
    return list(
        db.query(Category)
        .order_by(Category.category_level, Category.display_order)
        .all()
    )


def get_category(db: Session, category_id: int) -> Category:
    category = db.get(Category, category_id)
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="카테고리를 찾을 수 없습니다."
        )
    return category


def create_category(db: Session, data: dict, auth: AuthContext) -> Category:
    require_super_admin(db, auth)
    category = Category(**data)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def update_category(
    db: Session, category_id: int, data: dict, auth: AuthContext
) -> Category:
    require_super_admin(db, auth)
    category = get_category(db, category_id)
    for key, value in data.items():
        if value is not None:
            setattr(category, key, value)
    db.commit()
    db.refresh(category)
    return category


def deactivate_category(db: Session, category_id: int, auth: AuthContext) -> None:
    """실제 삭제가 아니라 active_yn='N' 처리 (소프트 삭제)."""
    require_super_admin(db, auth)
    category = get_category(db, category_id)
    category.active_yn = "N"
    db.commit()


def get_scoped_org_ids(db: Session, auth: AuthContext) -> list[int] | None:
    """None이면 전체 접근(최고관리자). 아니면 접근 가능한 org_id 목록(자기 조직 + 하위 조직)."""
    if is_super_admin(db, auth):
        return None
    if auth.org_id is None:
        return []
    rows = db.execute(
        text(
            "SELECT org_id FROM org_units "
            "WHERE org_id = :org_id OR parent_org_id = :org_id"
        ),
        {"org_id": auth.org_id},
    ).all()
    return [row[0] for row in rows]


# --- Products ------------------------------------------------------------
# 04_관리자권한매트릭스: products는 seller_user_id -> users.org_id로 간접 스코프.
# 최고관리자는 전체 CRUD, 지점장은 자기 org 소속 셀러 상품만 조회/수정 가능(등록/삭제는 불가).
# products 테이블엔 active_yn이 없어서(카테고리와 달리) 삭제 대신 product_status를
# PATCH로 STOPPED/DELETED로 바꾸는 방식만 제공한다 (별도 DELETE 엔드포인트 없음).


def _scope_products_by_seller_org(query, scoped_org_ids: list[int] | None):
    if scoped_org_ids is None:
        return query
    stmt = text(
        "seller_user_id IN (SELECT user_id FROM users WHERE org_id IN :org_ids)"
    ).bindparams(bindparam("org_ids", expanding=True))
    return query.filter(stmt).params(org_ids=scoped_org_ids or [-1])


def _assert_product_in_scope(db: Session, product: Product, auth: AuthContext) -> None:
    scoped = get_scoped_org_ids(db, auth)
    if scoped is None:
        return
    seller_org = db.execute(
        text("SELECT org_id FROM users WHERE user_id = :uid"),
        {"uid": product.seller_user_id},
    ).scalar()
    if seller_org not in scoped:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="담당 조직 소속 셀러의 상품이 아닙니다.",
        )


def list_products(
    db: Session,
    auth: AuthContext,
    page: int = 1,
    size: int = 20,
    category_id: int | None = None,
    product_status: str | None = None,
    keyword: str | None = None,
) -> tuple[list[Product], int]:
    query = _scope_products_by_seller_org(db.query(Product), get_scoped_org_ids(db, auth))
    if category_id is not None:
        query = query.filter(Product.category_id == category_id)
    if product_status is not None:
        query = query.filter(Product.product_status == product_status)
    if keyword:
        query = query.filter(Product.product_name.like(f"%{keyword}%"))
    total = query.count()
    items = (
        query.order_by(Product.product_id.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )
    return list(items), total


def get_product(db: Session, product_id: int, auth: AuthContext) -> Product:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="상품을 찾을 수 없습니다."
        )
    _assert_product_in_scope(db, product, auth)
    return product


def create_product(db: Session, data: dict, auth: AuthContext) -> Product:
    require_super_admin(db, auth)  # 지점장은 상품 등록 불가
    product = Product(**data)
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


def update_product(
    db: Session, product_id: int, data: dict, auth: AuthContext
) -> Product:
    product = get_product(db, product_id, auth)  # 조회 시 스코프 체크 포함(R/U는 지점장도 가능)
    for key, value in data.items():
        if value is not None:
            setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return product


# --- Product variants (SKU) ----------------------------------------------
# 04_관리자권한매트릭스: 상품과 동일한 스코프 규칙(부모 상품의 seller org 기준).


def list_variants(
    db: Session, product_id: int, auth: AuthContext
) -> list[ProductVariant]:
    get_product(db, product_id, auth)  # 존재 + 스코프 확인
    return list(
        db.query(ProductVariant)
        .filter(ProductVariant.product_id == product_id)
        .order_by(ProductVariant.variant_id)
        .all()
    )


def get_variant(db: Session, variant_id: int, auth: AuthContext) -> ProductVariant:
    variant = db.get(ProductVariant, variant_id)
    if variant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="옵션(SKU)을 찾을 수 없습니다."
        )
    product = db.get(Product, variant.product_id)
    if product is not None:
        _assert_product_in_scope(db, product, auth)
    return variant


def create_variant(
    db: Session, product_id: int, data: dict, auth: AuthContext
) -> ProductVariant:
    require_super_admin(db, auth)  # 지점장은 옵션 등록 불가
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
    variant = get_variant(db, variant_id, auth)
    for key, value in data.items():
        if value is not None:
            setattr(variant, key, value)
    db.commit()
    db.refresh(variant)
    return variant


def deactivate_variant(db: Session, variant_id: int, auth: AuthContext) -> None:
    """실제 삭제가 아니라 active_yn='N' 처리 (소프트 삭제)."""
    require_super_admin(db, auth)  # 지점장은 삭제 불가
    variant = get_variant(db, variant_id, auth)
    variant.active_yn = "N"
    db.commit()
