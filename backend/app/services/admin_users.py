"""Service layer for admin_users (org_units, users)."""

from fastapi import HTTPException, status
from sqlalchemy import text  # text 함수 임포트
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.dependencies.auth import AuthContext
from app.models.users import OrgUnit, User, SellerProfile
from app.schemas.admin_users import (
    OrganizationCreate, 
    OrganizationUpdate, 
    UserCreate, 
    UserUpdate,
    SellerProfileCreate,
    SellerProfileUpdate
)

def is_super_admin(db: Session, auth: AuthContext) -> bool:
    if auth.org_id is None:
        return False
    org = db.get(OrgUnit, auth.org_id)
    return org is not None and org.org_type == "HEADQUARTER"

def require_super_admin(
    db: Session, auth: AuthContext, detail: str = "최고관리자만 가능한 작업입니다."
) -> None:
    if not is_super_admin(db, auth):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)

def get_scoped_org_ids(db: Session, auth: AuthContext) -> list[int] | None:
    """None이면 전체 접근(최고관리자). 아니면 접근 가능한 org_id 목록(자기 조직 + 하위 조직)."""
    if is_super_admin(db, auth):
        return None
    if auth.org_id is None:
        return []
    rows = (
        db.query(OrgUnit.org_id)
        .filter((OrgUnit.org_id == auth.org_id) | (OrgUnit.parent_org_id == auth.org_id))
        .all()
    )
    return [row[0] for row in rows]

# --- Organizations (org_units) -------------------------------------------

def get_organizations(
    db: Session, auth: AuthContext, skip: int = 0, limit: int = 100
) -> list[OrgUnit]:
    query = db.query(OrgUnit)
    scoped = get_scoped_org_ids(db, auth)
    if scoped is not None:
        query = query.filter(OrgUnit.org_id.in_(scoped or [-1]))
    return query.order_by(OrgUnit.org_id).offset(skip).limit(limit).all()

def create_organization(
    db: Session, org_in: OrganizationCreate, auth: AuthContext
) -> OrgUnit:
    require_super_admin(db, auth, "최고관리자만 조직을 등록할 수 있습니다.")
    org = OrgUnit(**org_in.model_dump())
    db.add(org)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="이미 존재하는 조직 코드입니다."
        ) from exc
    db.refresh(org)
    return org

def update_organization(
    db: Session, org_id: int, org_in: OrganizationUpdate, auth: AuthContext
) -> OrgUnit:
    require_super_admin(db, auth, "최고관리자만 조직 정보를 수정할 수 있습니다.")

    org = db.get(OrgUnit, org_id)
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 조직을 찾을 수 없습니다."
        )

    update_data = org_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(org, key, value)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하거나 중복되는 조직 코드(또는 정보)입니다."
        ) from exc

    db.refresh(org)
    return org

# --- Users -------------------------------------------------------------

def get_users(
    db: Session, auth: AuthContext, skip: int = 0, limit: int = 100
) -> list[User]:
    query = db.query(User)
    scoped = get_scoped_org_ids(db, auth)
    if scoped is not None:
        query = query.filter(User.org_id.in_(scoped or [-1]))
    return query.order_by(User.user_id).offset(skip).limit(limit).all()

def create_user(db: Session, user_in: UserCreate, auth: AuthContext) -> User:
    require_super_admin(db, auth, "최고관리자만 회원을 등록할 수 있습니다.")
    user = User(
        login_id=user_in.login_id,
        password_hash=get_password_hash(user_in.password),
        user_name=user_in.user_name,
        email=user_in.email,
        phone=user_in.phone,
        org_id=user_in.org_id,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 로그인ID 또는 이메일입니다.",
        ) from exc
    db.refresh(user)
    return user

# --- My Profile (내 정보 조회 및 수정) -----------------------------------

def get_my_info(db: Session, auth: AuthContext) -> User:
    user = db.query(User).filter(User.user_id == auth.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다."
        )
    return user

def update_my_info(db: Session, auth: AuthContext, user_in: UserUpdate) -> User:
    user = db.query(User).filter(User.user_id == auth.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다."
        )

    update_data = user_in.model_dump(exclude_unset=True)
    if "phone" in update_data and update_data["phone"] is not None:
        user.phone = update_data["phone"]
    if "password" in update_data and update_data["password"] is not None:
        user.password_hash = get_password_hash(update_data["password"])

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="정보 수정 중 중복 오류가 발생했습니다.",
        ) from exc

    db.refresh(user)
    return user

# --- 회원 상세 조회 --------------------------------------------------------

def get_user_detail(db: Session, auth: AuthContext, user_id: int) -> User:
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 회원을 찾을 수 없습니다."
        )
    
    scoped = get_scoped_org_ids(db, auth)
    if scoped is not None:
        if user.org_id not in scoped:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="해당 회원의 상세 정보를 조회할 권한이 없습니다."
            )
            
    return user

# --- 회원 상태 변경 --------------------------------------------------------

def update_user_status(db: Session, auth: AuthContext, user_id: int, new_status: str) -> User:
    valid_statuses = {"ACTIVE", "INACTIVE", "SUSPENDED", "WITHDRAWN"}
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"유효하지 않은 회원 상태입니다. 가능한 상태: {valid_statuses}"
        )

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 회원을 찾을 수 없습니다."
        )
    
    scoped = get_scoped_org_ids(db, auth)
    if scoped is not None and user.org_id not in scoped:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="해당 회원의 상태를 변경할 권한이 없습니다."
        )

    user.user_status = new_status
    db.commit()
    db.refresh(user)
    return user

# --- 역할 부여/회수 (최고관리자 전용) ----------------------------------------

def update_user_roles(db: Session, auth: AuthContext, user_id: int, role_ids: list[int]) -> User:
    require_super_admin(db, auth, "최고관리자만 사용자 역할을 변경할 수 있습니다.")

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 회원을 찾을 수 없습니다."
        )
    
    try:
        db.execute(
            text("DELETE FROM user_roles WHERE user_id = :user_id"), 
            {"user_id": user_id}
        )
        
        for role_id in role_ids:
            db.execute(
                text("INSERT INTO user_roles (user_id, role_id) VALUES (:user_id, :role_id)"),
                {"user_id": user_id, "role_id": role_id}
            )
            
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="역할 업데이트 중 오류가 발생했습니다."
        ) from exc

    db.refresh(user)
    return user

# --- 판매자 프로필 관리 ----------------------------------------------------

def get_seller_profile(db: Session, auth: AuthContext, user_id: int) -> SellerProfile:
    get_user_detail(db, auth, user_id)
    
    profile = db.query(SellerProfile).filter(SellerProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 회원의 판매자 프로필이 존재하지 않습니다."
        )
    return profile

def create_seller_profile(
    db: Session, auth: AuthContext, user_id: int, profile_in: SellerProfileCreate
) -> SellerProfile:
    get_user_detail(db, auth, user_id)
    
    existing = db.query(SellerProfile).filter(SellerProfile.user_id == user_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 판매자 프로필이 존재합니다."
        )
    
    profile = SellerProfile(user_id=user_id, **profile_in.model_dump())
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile

def update_seller_profile(
    db: Session, auth: AuthContext, user_id: int, profile_in: SellerProfileUpdate
) -> SellerProfile:
    get_user_detail(db, auth, user_id)
    
    profile = db.query(SellerProfile).filter(SellerProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="해당 회원의 판매자 프로필이 존재하지 않습니다."
        )
    
    update_data = profile_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(profile, key, value)
        
    db.commit()
    db.refresh(profile)
    return profile