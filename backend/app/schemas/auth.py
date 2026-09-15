from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    """
    BUYER / SELLER / ADMIN 공통 로그인 요청.
    """

    login_id: str = Field(
        min_length=1,
        max_length=100,
    )

    password: str = Field(
        min_length=1,
        max_length=72,
    )


class AuthUserResponse(BaseModel):
    """
    공통 로그인 성공 시 반환할 사용자 정보.
    """

    user_id: int

    login_id: str

    user_name: str

    email: str | None = None

    phone: str | None = None

    user_status: str

    org_id: int | None = None

    org_type: str | None = None

    roles: list[str] = Field(
        default_factory=list,
    )


class TokenResponse(BaseModel):
    """
    공통 로그인 성공 응답.
    """

    access_token: str

    token_type: str = "bearer"

    user: AuthUserResponse