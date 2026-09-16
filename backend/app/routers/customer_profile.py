from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import (
    AuthContext,
    require_customer,
)
from app.schemas.customer_profile import (
    CustomerProfileResponse,
    CustomerProfileUpdateRequest,
)
from app.services import customer_profile as service


router = APIRouter(
    prefix="/customer/profile",
    tags=["Customer Profile"],
)


@router.get(
    "/me",
    response_model=CustomerProfileResponse,
)
def get_my_profile(
    auth: AuthContext = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CustomerProfileResponse:
    """
    로그인한 고객의 내 정보 조회.

    JWT에서 현재 로그인 사용자의 user_id를 가져와
    본인의 정보만 조회한다.
    """

    return service.get_customer_profile(
        db=db,
        user_id=auth.user_id,
    )


@router.patch(
    "/me",
    response_model=CustomerProfileResponse,
)
def update_my_profile(
    profile_in: CustomerProfileUpdateRequest,
    auth: AuthContext = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CustomerProfileResponse:
    """
    로그인한 고객의 내 정보 수정.

    수정 가능:
    - user_name
    - email
    - phone

    수정 불가:
    - user_id
    - login_id
    - password_hash
    - user_status
    - org_id
    - roles
    """

    return service.update_customer_profile(
        db=db,
        user_id=auth.user_id,
        profile_in=profile_in,
    )