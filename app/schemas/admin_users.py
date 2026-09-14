from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

# --- Organization 스키마 ---
class OrganizationBase(BaseModel):
    name: str

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationResponse(OrganizationBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- User 스키마 ---
class UserBase(BaseModel):
    email: EmailStr
    name: str
    organization_id: Optional[int] = None

class UserCreate(UserBase):
    password: str  # 회원가입 시에는 평문 비밀번호를 입력받음

class UserResponse(UserBase):
    id: int
    created_at: datetime
    organization: Optional[OrganizationResponse] = None  # 소속 조직 정보 포함

    class Config:
        from_attributes = True