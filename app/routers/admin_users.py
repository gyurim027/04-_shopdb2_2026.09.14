"""Router for Admin Users domain (org_units, users)."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import AuthContext, require_admin
from app.schemas.admin_users import (
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationOut,
    UserCreate,
    UserUpdate,
    UserOut,
    UserStatusUpdate,  # 회원 상태 변경용 스키마 임포트
)
from app.services import admin_users as service

router = APIRouter(
    prefix="/admin",
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

@router.patch("/organizations/{org_id}", response_model=OrganizationOut)
def update_organization(
    org_id: int,
    org_in: OrganizationUpdate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> OrganizationOut:
    """기존 조직의 정보를 수정합니다 (최고관리자 전용)."""
    return service.update_organization(db, org_id, org_in, auth)


# --- My Profile (내 정보 조회 및 수정) ------------------------------------


@router.get("/me", response_model=UserOut)
def get_my_profile(
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> UserOut:
    """현재 로그인한 관리자의 프로필 및 소속 조직 정보를 조회합니다."""
    return service.get_my_info(db, auth)


@router.patch("/me", response_model=UserOut)
def update_my_profile(
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> UserOut:
    """현재 로그인한 관리자의 연락처, 비밀번호 등 본인 정보를 수정합니다."""
    return service.update_my_info(db, auth, user_in)


# --- Users -----------------------------------------------------------------


@router.get("/users", response_model=list[UserOut])
def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> list[UserOut]:
    """사용자 목록을 조회합니다."""
    return service.get_users(db, auth, skip=skip, limit=limit)


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> UserOut:
    """새로운 사용자를 생성합니다 (관리자에 의한 계정 등록)."""
    return service.create_user(db, user__in if 'user__in' in locals() else user_in, auth)


# --- User Status Update (회원 상태 변경) ----------------------------------


@router.patch("/users/{user_id}/status", response_model=UserOut)
def change_user_status(
    user_id: int,
    body: UserStatusUpdate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> UserOut:
    """특정 회원의 상태(ACTIVE, SUSPENDED, WITHDRAWN 등)를 변경합니다."""
    return service.update_user_status(db, auth, user_id=user_id, new_status=body.user_status)