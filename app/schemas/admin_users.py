"""Pydantic schemas for admin_users (org_units, users)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

USER_STATUSES = ("ACTIVE", "INACTIVE", "SUSPENDED", "WITHDRAWN")
ORG_TYPES = ("HEADQUARTER", "BRANCH", "STORE", "WAREHOUSE")


# --- Organizations (org_units) -------------------------------------------


class OrganizationCreate(BaseModel):
    org_code: str = Field(..., max_length=50)
    org_name: str = Field(..., max_length=150)
    org_type: str
    parent_org_id: int | None = None
    business_number: str | None = Field(None, max_length=30)
    representative_name: str | None = Field(None, max_length=100)
    phone: str | None = Field(None, max_length=30)
    email: str | None = Field(None, max_length=255)
    zipcode: str | None = Field(None, max_length=20)
    address1: str | None = Field(None, max_length=300)
    address2: str | None = Field(None, max_length=300)


class OrganizationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    org_id: int
    parent_org_id: int | None
    org_code: str
    org_name: str
    org_type: str
    business_number: str | None
    representative_name: str | None
    phone: str | None
    email: str | None
    zipcode: str | None
    address1: str | None
    address2: str | None
    active_yn: str
    created_at: datetime
    updated_at: datetime

class OrganizationUpdate(BaseModel):
    org_code: str | None = Field(None, max_length=50)
    org_name: str | None = Field(None, max_length=150)
    org_type: str | None = None
    parent_org_id: int | None = None
    business_number: str | None = Field(None, max_length=30)
    representative_name: str | None = Field(None, max_length=100)
    phone: str | None = Field(None, max_length=30)
    email: str | None = Field(None, max_length=255)
    zipcode: str | None = Field(None, max_length=20)
    address1: str | None = Field(None, max_length=300)
    address2: str | None = Field(None, max_length=300)


# --- Users -----------------------------------------------------------------


class UserCreate(BaseModel):
    login_id: str = Field(..., max_length=100)
    password: str  # 평문 입력, 서비스 레이어에서 해시 처리
    user_name: str = Field(..., max_length=100)
    email: EmailStr
    phone: str | None = Field(None, max_length=30)
    org_id: int | None = None


class UserUpdate(BaseModel):
    phone: str | None = Field(None, max_length=30)
    password: str | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    org_id: int | None
    login_id: str
    user_name: str
    email: str
    phone: str | None
    user_status: str
    created_at: datetime
    updated_at: datetime

class UserDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    org_id: int | None
    login_id: str
    user_name: str
    email: str
    phone: str | None
    user_status: str
    created_at: datetime
    updated_at: datetime
    # 필요에 따라 소속 조직명이나 배송지 등 추가 필드 확장 가능

class UserStatusUpdate(BaseModel):
    user_status: str = Field(..., description="변경할 회원 상태 (ACTIVE, SUSPENDED, WITHDRAWN 등)")

class UserRoleUpdate(BaseModel):
    roles: list[int] = Field(..., description="부여할 역할 ID 목록 (예: [1, 2, 3])")
    # 혹은 변수명을 role_ids로 명시하는 것도 직관적입니다.
    # role_ids: list[int] = Field(..., description="부여할 역할 ID 목록")