from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.models.users import User
from app.schemas.customer_auth import (
    CustomerLoginRequest,
    CustomerRegisterRequest,
    CustomerTokenResponse,
    CustomerUserResponse,
)


def _get_user_roles(db: Session, user_id: int) -> list[str]:
    """
    기존 roles / user_roles 테이블에서
    사용자의 역할 목록을 조회한다.

    DB 구조는 변경하지 않고 기존 테이블을 그대로 사용한다.
    """
    rows = db.execute(
        text(
            """
            SELECT r.role_code
            FROM roles AS r
            INNER JOIN user_roles AS ur
                ON ur.role_id = r.role_id
            WHERE ur.user_id = :user_id
            ORDER BY r.role_id
            """
        ),
        {"user_id": user_id},
    ).scalars().all()

    return [str(role_code) for role_code in rows]


def _make_user_response(
    user: User,
    roles: list[str],
) -> CustomerUserResponse:
    """
    User ORM 객체를 고객 응답 형태로 변환한다.
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
    고객 회원가입

    1. login_id 중복 확인
    2. email 중복 확인
    3. 비밀번호 bcrypt 해시
    4. users 테이블에 고객 생성
    5. 기존 roles 테이블에서 BUYER 역할 조회
    6. user_roles 테이블에 BUYER 역할 연결
    """

    existing_login_id = (
        db.query(User)
        .filter(User.login_id == customer_in.login_id)
        .first()
    )

    if existing_login_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 사용 중인 로그인 ID입니다.",
        )

    existing_email = (
        db.query(User)
        .filter(User.email == customer_in.email)
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
        password_hash=hash_password(customer_in.password),
        user_name=customer_in.user_name,
        email=customer_in.email,
        phone=customer_in.phone,
        user_status="ACTIVE",
    )

    try:
        db.add(user)

        # INSERT 후 user_id를 받기 위해 flush
        db.flush()

        # 기존 roles 테이블에서 BUYER 역할 ID 조회
        buyer_role_id = db.execute(
            text(
                """
                SELECT role_id
                FROM roles
                WHERE role_code = :role_code
                LIMIT 1
                """
            ),
            {"role_code": "BUYER"},
        ).scalar_one_or_none()

        if buyer_role_id is None:
            db.rollback()

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="BUYER 역할이 데이터베이스에 존재하지 않습니다.",
            )

        # 기존 user_roles 테이블에 고객 역할 연결
        db.execute(
            text(
                """
                INSERT INTO user_roles (user_id, role_id)
                VALUES (:user_id, :role_id)
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


def login_customer(
    db: Session,
    login_in: CustomerLoginRequest,
) -> CustomerTokenResponse:
    """
    고객 로그인

    1. login_id로 사용자 검색
    2. 비밀번호 검증
    3. 사용자 상태 확인
    4. user_roles에서 BUYER 역할 확인
    5. JWT 발급
    """

    user = (
        db.query(User)
        .filter(User.login_id == login_in.login_id)
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="로그인 ID 또는 비밀번호가 올바르지 않습니다.",
        )

    if not verify_password(
        login_in.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="로그인 ID 또는 비밀번호가 올바르지 않습니다.",
        )

    if user.user_status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="현재 사용할 수 없는 계정입니다.",
        )

    roles = _get_user_roles(
        db=db,
        user_id=user.user_id,
    )

    if "BUYER" not in roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="고객 권한이 없는 계정입니다.",
        )

    access_token = create_access_token(
        subject=str(user.user_id),
        extra_claims={
            "roles": roles,
            "org_id": user.org_id,
        },
    )

    return CustomerTokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=_make_user_response(
            user=user,
            roles=roles,
        ),
    )