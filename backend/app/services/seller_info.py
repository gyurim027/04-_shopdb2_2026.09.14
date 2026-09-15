"""Service layer for seller_info (S-INFO-01~03 + S-SALES-05 정산계좌).

seller_profiles는 이번에 규림님 소유로 신설한 도메인(models/seller_profiles.py)이라 ORM을
쓰지만, users 테이블은 명현님 소유(models/users.py)라 §10 규칙에 따라 조인이 필요한 이름/이메일/
전화번호 조회는 raw SQL로 처리한다.
"""

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.dependencies.auth import AuthContext
from app.models.seller_profiles import SellerProfile


def _get_owned_profile(db: Session, auth: AuthContext) -> SellerProfile:
    profile = (
        db.query(SellerProfile).filter(SellerProfile.user_id == auth.user_id).first()
    )
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="판매자 프로필을 찾을 수 없습니다."
        )
    return profile


def get_profile(db: Session, auth: AuthContext) -> dict:
    profile = _get_owned_profile(db, auth)
    user_row = db.execute(
        text("SELECT user_name, email, phone FROM users WHERE user_id = :user_id"),
        {"user_id": auth.user_id},
    ).first()
    return {
        "seller_id": profile.seller_id,
        "user_id": profile.user_id,
        "company_name": profile.company_name,
        "business_number": profile.business_number,
        "representative_name": profile.representative_name,
        "seller_status": profile.seller_status,
        "user_name": user_row.user_name if user_row else None,
        "email": user_row.email if user_row else None,
        "phone": user_row.phone if user_row else None,
    }


def update_profile(db: Session, data: dict, auth: AuthContext) -> dict:
    profile = _get_owned_profile(db, auth)
    for key, value in data.items():
        if value is not None:
            setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return get_profile(db, auth)


def get_status(db: Session, auth: AuthContext) -> dict:
    profile = _get_owned_profile(db, auth)
    return {"seller_status": profile.seller_status}


def get_settlement_account(db: Session, auth: AuthContext) -> dict:
    profile = _get_owned_profile(db, auth)
    return {
        "settlement_bank": profile.settlement_bank,
        "settlement_account": profile.settlement_account,
    }


def update_settlement_account(db: Session, data: dict, auth: AuthContext) -> dict:
    profile = _get_owned_profile(db, auth)
    profile.settlement_bank = data["settlement_bank"]
    profile.settlement_account = data["settlement_account"]
    db.commit()
    db.refresh(profile)
    return {
        "settlement_bank": profile.settlement_bank,
        "settlement_account": profile.settlement_account,
    }
