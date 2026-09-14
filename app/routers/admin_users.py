from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.admin_users import (
    UserCreate,
    UserResponse,
    OrganizationCreate,
    OrganizationResponse,
)
from app.services import admin_users as service

router = APIRouter(
    prefix="/admin/users",
    tags=["Admin Users & Organizations"],
)

# --- Organization 엔드포인트 ---
@router.post("/organizations", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
def create_organization(org_in: OrganizationCreate, db: Session = Depends(get_db)):
    """새로운 조직을 생성합니다."""
    return service.create_organization(db=db, org_in=org_in)

@router.get("/organizations", response_model=List[OrganizationResponse])
def read_organizations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """조직 목록을 조회합니다."""
    return service.get_organizations(db=db, skip=skip, limit=limit)


# --- User 엔드포인트 ---
@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user_in: UserCreate, db: Session = Depends(get_db)):
    """새로운 사용자를 생성(회원가입)합니다."""
    return service.create_user(db=db, user_in=user_in)

@router.get("", response_model=List[UserResponse])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """사용자 목록을 조회합니다."""
    return service.get_users(db=db, skip=skip, limit=limit)