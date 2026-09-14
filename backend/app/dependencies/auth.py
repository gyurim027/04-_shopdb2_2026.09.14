from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt import InvalidTokenError

from app.core.security import decode_access_token


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


@dataclass(frozen=True)
class AuthContext:
    user_id: int
    roles: tuple[str, ...]
    org_id: int | None = None


def get_current_auth(token: str | None = Depends(oauth2_scheme)) -> AuthContext:
    """Decode common auth claims without importing a domain model.

    Domain owners can later connect login/user DB validation while keeping this
    dependency path stable for all A/B/C code.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    try:
        payload = decode_access_token(token)
        user_id = int(payload["sub"])
    except (InvalidTokenError, KeyError, TypeError, ValueError) as exc:
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
        roles=tuple(str(role) for role in raw_roles),
        org_id=int(org_id) if org_id is not None else None,
    )


def require_admin(auth: AuthContext = Depends(get_current_auth)) -> AuthContext:
    if "ADMIN" not in auth.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ADMIN role required",
        )
    return auth
