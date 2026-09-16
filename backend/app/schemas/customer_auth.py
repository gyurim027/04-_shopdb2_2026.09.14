from pydantic import BaseModel, Field


class CustomerRegisterRequest(BaseModel):
    """고객 회원가입 요청."""

    login_id: str = Field(
        min_length=4,
        max_length=100,
    )

    password: str = Field(
        min_length=8,
        max_length=72,
    )

    user_name: str = Field(
        min_length=1,
        max_length=100,
    )

    email: str

    phone: str | None = None


class CustomerUserResponse(BaseModel):
    """고객 회원가입 후 기본 정보 응답."""

    user_id: int

    login_id: str

    user_name: str

    email: str | None = None

    phone: str | None = None

    user_status: str

    org_id: int | None = None

    roles: list[str] = Field(
        default_factory=list,
    )