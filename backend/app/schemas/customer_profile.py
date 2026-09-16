from pydantic import BaseModel, Field


class CustomerProfileResponse(BaseModel):
    """고객 내 정보 조회 응답"""

    user_id: int
    login_id: str
    user_name: str
    email: str | None = None
    phone: str | None = None
    user_status: str
    org_id: int | None = None
    roles: list[str] = Field(default_factory=list)


class CustomerProfileUpdateRequest(BaseModel):
    """고객 내 정보 수정 요청"""

    user_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
        description="고객 이름",
    )

    email: str | None = Field(
        default=None,
        max_length=255,
        description="이메일",
    )

    phone: str | None = Field(
        default=None,
        max_length=30,
        description="전화번호",
    )