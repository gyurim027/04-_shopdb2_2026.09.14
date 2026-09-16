from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
)
from app.services import auth as service


router = APIRouter(
    prefix="/auth",
    tags=["Auth"],
)


@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    login_in: LoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """
    BUYER / SELLER / ADMIN 공용 로그인.

    로그인 성공 시 사용자의 역할과 조직 정보를 포함한
    JWT access token을 발급한다.

    실제 API 접근 권한은 각 도메인의
    require_customer / require_seller / require_admin에서
    별도로 검사한다.
    """

    return service.login(
        db=db,
        login_in=login_in,
    )