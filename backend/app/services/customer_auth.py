from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.users import User
from app.schemas.customer_auth import (
    CustomerRegisterRequest,
    CustomerUserResponse,
)


def _make_user_response(
    user: User,
    roles: list[str],
) -> CustomerUserResponse:
    """
    User ORM 객체를 고객 회원가입 응답 형태로 변환한다.
    """

    return CustomerUserResponse(
        user_id=user.user_id,
        login_id=user.login_id,
        user_name=user.user_name,
        email=user.email,
        phone=user.phone,
        user_status=user.user_status,
        org_id=user.org_id,
        roles=roles,
    )


def register_customer(
    db: Session,
    customer_in: CustomerRegisterRequest,
) -> CustomerUserResponse:
    """
    고객 회원가입.

    처리 순서:
    1. login_id 중복 확인
    2. email 중복 확인
    3. 비밀번호 bcrypt 해시
    4. users 테이블에 고객 생성
    5. 기존 roles 테이블에서 BUYER 역할 조회
    6. user_roles 테이블에 BUYER 역할 연결

    로그인은 공용 API인
    POST /api/auth/login 에서 처리한다.
    """

    existing_login_id = (
        db.query(User)
        .filter(
            User.login_id == customer_in.login_id
        )
        .first()
    )

    if existing_login_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 사용 중인 로그인 ID입니다.",
        )

    existing_email = (
        db.query(User)
        .filter(
            User.email == customer_in.email
        )
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 사용 중인 이메일입니다.",
        )

    user = User(
        org_id=None,
        login_id=customer_in.login_id,
        password_hash=hash_password(
            customer_in.password
        ),
        user_name=customer_in.user_name,
        email=customer_in.email,
        phone=customer_in.phone,
        user_status="ACTIVE",
    )

    try:
        db.add(user)

        # INSERT 후 생성된 user_id를 받기 위해 flush
        db.flush()

        buyer_role_id = db.execute(
            text(
                """
                SELECT role_id
                FROM roles
                WHERE role_code = :role_code
                LIMIT 1
                """
            ),
            {
                "role_code": "BUYER",
            },
        ).scalar_one_or_none()

        if buyer_role_id is None:
            db.rollback()

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="BUYER 역할이 데이터베이스에 존재하지 않습니다.",
            )

        db.execute(
            text(
                """
                INSERT INTO user_roles (
                    user_id,
                    role_id
                )
                VALUES (
                    :user_id,
                    :role_id
                )
                """
            ),
            {
                "user_id": user.user_id,
                "role_id": buyer_role_id,
            },
        )

        db.commit()

    except HTTPException:
        raise

    except IntegrityError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 로그인 ID 또는 이메일입니다.",
        ) from exc

    db.refresh(user)

    return _make_user_response(
        user=user,
        roles=["BUYER"],
    )