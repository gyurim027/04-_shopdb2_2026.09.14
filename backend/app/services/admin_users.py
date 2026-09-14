"""Service layer for admin_users (org_units, users)."""

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.dependencies.auth import AuthContext
from app.models.users import OrgUnit, User
from app.schemas.admin_users import OrganizationCreate, UserCreate


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
# 04_관리자권한매트릭스: org_units는 최고관리자 CRUD(전체), 지점장은 자기 조직+하위만 조회.


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


# --- Users -------------------------------------------------------------
# 04_관리자권한매트릭스: users는 최고관리자 CRUD(전체), 지점장은 자기 org 하위만 조회/상태변경.


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
