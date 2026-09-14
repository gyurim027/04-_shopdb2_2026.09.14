"""Router for Admin Products domain (categories, products, variants, images, files, inventories)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import AuthContext, require_admin
from app.schemas.admin_products import CategoryCreate, CategoryOut, CategoryUpdate
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
