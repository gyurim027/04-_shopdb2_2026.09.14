"""Service layer for admin_products (categories, products, variants, images, files, inventories)."""

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.dependencies.auth import AuthContext
from app.models.products import Category


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
