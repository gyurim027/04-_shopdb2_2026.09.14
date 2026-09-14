"""Router for Admin Users domain (org_units, users)."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import AuthContext, require_admin
from app.schemas.admin_users import (
    OrganizationCreate,
    OrganizationOut,
    UserCreate,
    UserOut,
)
from app.services import admin_users as service

router = APIRouter(
    prefix="/admin/users",
    tags=["Admin Users & Organizations"],
)


# --- Organizations (org_units) -------------------------------------------


@router.get("/organizations", response_model=list[OrganizationOut])
def read_organizations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> list[OrganizationOut]:
    """조직 목록을 조회합니다."""
    return service.get_organizations(db, auth, skip=skip, limit=limit)


@router.post(
    "/organizations", response_model=OrganizationOut, status_code=status.HTTP_201_CREATED
)
def create_organization(
    org_in: OrganizationCreate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> OrganizationOut:
    """새로운 조직을 생성합니다."""
    return service.create_organization(db, org_in, auth)


# --- Users -----------------------------------------------------------------


@router.get("", response_model=list[UserOut])
def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> list[UserOut]:
    """사용자 목록을 조회합니다."""
    return service.get_users(db, auth, skip=skip, limit=limit)


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> UserOut:
    """새로운 사용자를 생성합니다 (관리자에 의한 계정 등록)."""
    return service.create_user(db, user_in, auth)
