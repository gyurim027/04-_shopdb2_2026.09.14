"""Router for Admin Products domain (categories, products, variants, images, files, inventories)."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import AuthContext, require_admin
from app.schemas.admin_products import (
    CategoryCreate,
    CategoryOut,
    CategoryUpdate,
    ProductCreate,
    ProductOut,
    ProductPage,
    ProductUpdate,
    VariantCreate,
    VariantOut,
    VariantUpdate,
)
from app.services import admin_products as service

router = APIRouter(prefix="/admin/products", tags=["Admin Products"])


# --- Categories --------------------------------------------------------


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> list[CategoryOut]:
    return service.list_categories(db)


@router.get("/categories/{category_id}", response_model=CategoryOut)
def get_category(
    category_id: int,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> CategoryOut:
    return service.get_category(db, category_id)


@router.post("/categories", response_model=CategoryOut, status_code=201)
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> CategoryOut:
    return service.create_category(db, payload.model_dump(), auth)


@router.patch("/categories/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int,
    payload: CategoryUpdate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> CategoryOut:
    return service.update_category(
        db, category_id, payload.model_dump(exclude_unset=True), auth
    )


@router.delete("/categories/{category_id}", status_code=204)
def deactivate_category(
    category_id: int,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> None:
    service.deactivate_category(db, category_id, auth)


# --- Products ------------------------------------------------------------
# products 테이블엔 active_yn이 없어 DELETE 엔드포인트는 두지 않는다.
# 판매중지/삭제는 PATCH로 product_status를 STOPPED/DELETED로 바꿔서 처리한다.


@router.get("/products", response_model=ProductPage)
def list_products(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    category_id: int | None = None,
    product_status: str | None = None,
    keyword: str | None = None,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> ProductPage:
    items, total = service.list_products(
        db,
        auth,
        page=page,
        size=size,
        category_id=category_id,
        product_status=product_status,
        keyword=keyword,
    )
    return ProductPage(items=items, total=total, page=page, size=size)


@router.get("/products/{product_id}", response_model=ProductOut)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> ProductOut:
    return service.get_product(db, product_id, auth)


@router.post("/products", response_model=ProductOut, status_code=201)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> ProductOut:
    return service.create_product(db, payload.model_dump(), auth)


@router.patch("/products/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> ProductOut:
    return service.update_product(
        db, product_id, payload.model_dump(exclude_unset=True), auth
    )


# --- Product variants (SKU) ----------------------------------------------


@router.get("/products/{product_id}/variants", response_model=list[VariantOut])
def list_variants(
    product_id: int,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> list[VariantOut]:
    return service.list_variants(db, product_id, auth)


@router.post(
    "/products/{product_id}/variants", response_model=VariantOut, status_code=201
)
def create_variant(
    product_id: int,
    payload: VariantCreate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> VariantOut:
    return service.create_variant(db, product_id, payload.model_dump(), auth)


@router.patch("/variants/{variant_id}", response_model=VariantOut)
def update_variant(
    variant_id: int,
    payload: VariantUpdate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> VariantOut:
    return service.update_variant(
        db, variant_id, payload.model_dump(exclude_unset=True), auth
    )


@router.delete("/variants/{variant_id}", status_code=204)
def deactivate_variant(
    variant_id: int,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> None:
    service.deactivate_variant(db, variant_id, auth)
