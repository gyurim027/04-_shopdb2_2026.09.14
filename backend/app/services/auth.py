from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    verify_password,
)
from app.models.users import User
from app.schemas.auth import (
    AuthUserResponse,
    LoginRequest,
    TokenResponse,
)


def _get_user_roles(
    db: Session,
    user_id: int,
) -> list[str]:
    """
    사용자가 보유한 역할 목록 조회.

    BUYER / SELLER / ADMIN 등
    roles 테이블에 연결된 역할을 모두 반환한다.
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
        {
            "user_id": user_id,
        },
    ).scalars().all()

    return [
        str(role_code)
        for role_code in rows
    ]


def _get_org_type(
    db: Session,
    org_id: int | None,
) -> str | None:
    """
    사용자가 속한 조직의 org_type 조회.

    일반 고객처럼 org_id가 없는 경우
    org_type도 None을 반환한다.
    """

    if org_id is None:
        return None

    org_type = db.execute(
        text(
            """
            SELECT org_type
            FROM org_units
            WHERE org_id = :org_id
            LIMIT 1
            """
        ),
        {
            "org_id": org_id,
        },
    ).scalar_one_or_none()

    if org_type is None:
        return None

    return str(org_type)


def _make_auth_user_response(
    user: User,
    roles: list[str],
    org_type: str | None,
) -> AuthUserResponse:
    """
    User ORM 객체를 공용 로그인 응답 형태로 변환한다.
    """

    return AuthUserResponse(
        user_id=user.user_id,
        login_id=user.login_id,
        user_name=user.user_name,
        email=user.email,
        phone=user.phone,
        user_status=user.user_status,
        org_id=user.org_id,
        org_type=org_type,
        roles=roles,
    )


def login(
    db: Session,
    login_in: LoginRequest,
) -> TokenResponse:
    """
    BUYER / SELLER / ADMIN 공통 로그인.

    처리 순서:
    1. login_id로 사용자 조회
    2. 비밀번호 검증
    3. ACTIVE 계정인지 확인
    4. 사용자의 역할 목록 조회
    5. 조직이 있다면 org_type 조회
    6. JWT 발급

    로그인 단계에서는 특정 역할을 강제하지 않는다.

    실제 API 접근 권한은
    require_customer / require_seller / require_admin에서
    각각 검사한다.
    """

    user = (
        db.query(User)
        .filter(
            User.login_id == login_in.login_id
        )
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

    org_type = _get_org_type(
        db=db,
        org_id=user.org_id,
    )

    access_token = create_access_token(
        subject=str(user.user_id),
        extra_claims={
            "roles": roles,
            "org_id": user.org_id,
            "org_type": org_type,
        },
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=_make_auth_user_response(
            user=user,
            roles=roles,
            org_type=org_type,
        ),
    )
