"""Service layer for admin_products (categories, products, variants, images, files, inventories)."""

from fastapi import HTTPException, status
from sqlalchemy import bindparam, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.dependencies.auth import AuthContext
from app.models.products import (
    Category,
    Inventory,
    Product,
    ProductFile,
    ProductImage,
    ProductVariant,
)


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


def require_super_admin(
    db: Session, auth: AuthContext, detail: str = "최고관리자만 가능한 작업입니다."
) -> None:
    """04_관리자권한매트릭스: 도메인별로 최고관리자(HQ) 전용인 쓰기 작업에 사용."""
    if not is_super_admin(db, auth):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


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
# 최고관리자는 전체 CRUD, 지점장은 자기 org 소속 셀러 상품만 조회/수정 가능.


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
    # 💡 [요구사항 3 반영] 최고관리자(HQ)뿐만 아니라 지점장(BRANCH)도 본인 조직 권한 범위 내에서 상품 등록 가능하도록 허용
    if auth.org_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="소속 조직이 없어 상품을 등록할 수 없습니다."
        )
    
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
    product = get_product(db, product_id, auth)  # 조회 시 스코프 체크 포함
    for key, value in data.items():
        if value is not None:
            setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return product


# --- Product variants (SKU) ----------------------------------------------

def list_variants(
    db: Session, product_id: int, auth: AuthContext
) -> list[ProductVariant]:
    get_product(db, product_id, auth)
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
    # 💡 지점장도 옵션 등록 허용
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
    require_super_admin(db, auth)
    variant = get_variant(db, variant_id, auth)
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


def get_image(db: Session, product_image_id: int, auth: AuthContext) -> ProductImage:
    image = db.get(ProductImage, product_image_id)
    if image is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="상품 이미지를 찾을 수 없습니다."
        )
    product = db.get(Product, image.product_id)
    if product is not None:
        _assert_product_in_scope(db, product, auth)
    return image


def create_image(
    db: Session, product_id: int, data: dict, auth: AuthContext
) -> ProductImage:
    get_product(db, product_id, auth)
    image = ProductImage(product_id=product_id, **data)
    db.add(image)
    db.commit()
    db.refresh(image)
    return image


def update_image(
    db: Session, product_image_id: int, data: dict, auth: AuthContext
) -> ProductImage:
    image = get_image(db, product_image_id, auth)
    for key, value in data.items():
        if value is not None:
            setattr(image, key, value)
    db.commit()
    db.refresh(image)
    return image


def deactivate_image(db: Session, product_image_id: int, auth: AuthContext) -> None:
    require_super_admin(db, auth)
    image = get_image(db, product_image_id, auth)
    image.active_yn = "N"
    db.commit()


# --- Product files (첨부파일) ------------------------------------------------

def list_files(db: Session, product_id: int, auth: AuthContext) -> list[ProductFile]:
    get_product(db, product_id, auth)
    return list(
        db.query(ProductFile)
        .filter(ProductFile.product_id == product_id)
        .order_by(ProductFile.display_order)
        .all()
    )


def get_file(db: Session, product_file_id: int, auth: AuthContext) -> ProductFile:
    file_row = db.get(ProductFile, product_file_id)
    if file_row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="상품 첨부파일을 찾을 수 없습니다."
        )
    product = db.get(Product, file_row.product_id)
    if product is not None:
        _assert_product_in_scope(db, product, auth)
    return file_row


def create_file(
    db: Session, product_id: int, data: dict, auth: AuthContext
) -> ProductFile:
    get_product(db, product_id, auth)
    file_row = ProductFile(product_id=product_id, **data)
    db.add(file_row)
    db.commit()
    db.refresh(file_row)
    return file_row


def update_file(
    db: Session, product_file_id: int, data: dict, auth: AuthContext
) -> ProductFile:
    file_row = get_file(db, product_file_id, auth)
    for key, value in data.items():
        if value is not None:
            setattr(file_row, key, value)
    db.commit()
    db.refresh(file_row)
    return file_row


def delete_file(db: Session, product_file_id: int, auth: AuthContext) -> None:
    require_super_admin(db, auth)
    file_row = get_file(db, product_file_id, auth)
    db.delete(file_row)
    db.commit()


# --- Inventories -------------------------------------------------------

def _assert_org_in_scope(db: Session, org_id: int, auth: AuthContext) -> None:
    scoped = get_scoped_org_ids(db, auth)
    if scoped is not None and org_id not in scoped:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="담당 조직의 재고가 아닙니다."
        )


def list_inventories(
    db: Session,
    auth: AuthContext,
    variant_id: int | None = None,
    low_stock_only: bool = False,
) -> list[Inventory]:
    scoped = get_scoped_org_ids(db, auth)
    
    # 💡 [핵심] variant와 variant에 연결된 product 정보를 함께 join해서 가져옵니다.
    query = db.query(Inventory).options(
        joinedload(Inventory.variant).joinedload(ProductVariant.product)
    )
    
    if scoped is not None:
        query = query.filter(Inventory.org_id.in_(scoped or [-1]))
    if variant_id is not None:
        query = query.filter(Inventory.variant_id == variant_id)
    if low_stock_only:
        query = query.filter(
            (Inventory.stock_quantity - Inventory.reserved_quantity)
            <= Inventory.safety_stock
        )
    return list(query.order_by(Inventory.inventory_id).all())


def get_inventory(db: Session, inventory_id: int, auth: AuthContext) -> Inventory:
    inventory = db.get(Inventory, inventory_id)
    if inventory is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="재고 정보를 찾을 수 없습니다."
        )
    _assert_org_in_scope(db, inventory.org_id, auth)
    return inventory


def create_inventory(db: Session, data: dict, auth: AuthContext) -> Inventory:
    if not is_super_admin(db, auth):
        if auth.org_id is None or data["org_id"] != auth.org_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="자기 조직의 재고만 등록할 수 있습니다.",
            )
    inventory = Inventory(**data)
    db.add(inventory)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 해당 조직/옵션 조합의 재고가 존재합니다.",
        ) from exc
    db.refresh(inventory)
    return inventory


def update_inventory(
    db: Session, inventory_id: int, data: dict, auth: AuthContext
) -> Inventory:
    inventory = get_inventory(db, inventory_id, auth)
    for key, value in data.items():
        if value is not None:
            setattr(inventory, key, value)
    db.commit()
    db.refresh(inventory)
    return inventory


def delete_inventory(db: Session, inventory_id: int, auth: AuthContext) -> None:
    require_super_admin(db, auth, detail="최고관리자만 재고를 삭제할 수 있습니다.")
    inventory = get_inventory(db, inventory_id, auth)
    db.delete(inventory)
    db.commit()