from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.customer_auth import (
    CustomerLoginRequest,
    CustomerRegisterRequest,
    CustomerTokenResponse,
    CustomerUserResponse,
)
from app.services import customer_auth as service


router = APIRouter(
    prefix="/customer/auth",
    tags=["Customer Auth"],
)


@router.post(
    "/register",
    response_model=CustomerUserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_customer(
    customer_in: CustomerRegisterRequest,
    db: Session = Depends(get_db),
) -> CustomerUserResponse:
    """
    고객 회원가입

    - 기존 users 테이블 사용
    - BUYER 역할 자동 부여
    - DB 테이블/컬럼 구조 변경 없음
    """
    return service.register_customer(
        db=db,
        customer_in=customer_in,
    )


@router.post(
    "/login",
    response_model=CustomerTokenResponse,
)
def login_customer(
    login_in: CustomerLoginRequest,
    db: Session = Depends(get_db),
) -> CustomerTokenResponse:
    """
    고객 로그인

    - login_id / password 확인
    - BUYER 역할 확인
    - 로그인 성공 시 JWT 발급
    """
    return service.login_customer(
        db=db,
        login_in=login_in,
    )