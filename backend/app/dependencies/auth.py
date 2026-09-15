from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt import InvalidTokenError

from app.core.security import decode_access_token


oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/customer/auth/login",
    auto_error=False,
)


@dataclass(frozen=True)
class AuthContext:
    user_id: int
    roles: tuple[str, ...]
    org_id: int | None = None


def get_current_auth(
    token: str | None = Depends(oauth2_scheme),
) -> AuthContext:
    """
    JWT 토큰을 해석해서 현재 로그인 사용자의 인증 정보를 반환한다.

    JWT에서 사용하는 정보:
    - sub: user_id
    - roles: 사용자의 역할 목록
    - org_id: 소속 조직 ID
    """

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    try:
        payload = decode_access_token(token)

        user_id = int(payload["sub"])

    except (
        InvalidTokenError,
        KeyError,
        TypeError,
        ValueError,
    ) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc

    raw_roles = payload.get("roles", [])

    if isinstance(raw_roles, str):
        raw_roles = [raw_roles]

    org_id = payload.get("org_id")

    return AuthContext(
        user_id=user_id,
        roles=tuple(
            str(role)
            for role in raw_roles
        ),
        org_id=(
            int(org_id)
            if org_id is not None
            else None
        ),
    )


def require_admin(
    auth: AuthContext = Depends(get_current_auth),
) -> AuthContext:
    """
    ADMIN 역할이 있는 사용자만 접근 가능.
    """

    if "ADMIN" not in auth.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ADMIN role required",
        )

    return auth


def require_customer(
    auth: AuthContext = Depends(get_current_auth),
) -> AuthContext:
    """
    Customer API 접근 권한 검사.

    코드에서는 customer라는 이름을 사용하지만,
    기존 DB 역할값은 BUYER이므로 BUYER 역할을 검사한다.

    DB 구조 및 역할값은 수정하지 않는다.
    """

    if "BUYER" not in auth.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="BUYER role required",
        )

    return auth