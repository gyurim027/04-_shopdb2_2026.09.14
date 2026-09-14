from sqlalchemy.orm import Session
from app.models.users import User, Organization
from app.schemas.admin_users import UserCreate, OrganizationCreate
from app.core.security import get_password_hash

# --- Organization 서비스 ---
def get_organizations(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Organization).offset(skip).limit(limit).all()

def create_organization(db: Session, org_in: OrganizationCreate):
    db_org = Organization(name=org_in.name)
    db.add(db_org)
    db.commit()
    db.refresh(db_org)
    return db_org


# --- User 서비스 ---
def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(User).offset(skip).limit(limit).all()

def create_user(db: Session, user_in: UserCreate):
    # 비밀번호 해시화 처리
    hashed_pwd = get_password_hash(user_in.password)
    
    db_user = User(
        email=user_in.email,
        name=user_in.name,
        hashed_password=hashed_pwd,
        organization_id=user_in.organization_id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user