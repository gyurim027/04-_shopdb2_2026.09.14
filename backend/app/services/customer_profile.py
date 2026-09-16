from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.users import User
from app.schemas.customer_profile import (
    CustomerProfileResponse,
    CustomerProfileUpdateRequest,
)


def _get_user_roles(
    db: Session,
    user_id: int,
) -> list[str]:
    """
    기존 roles / user_roles 테이블을 이용해서
    사용자의 역할 목록을 조회한다.

    DB 테이블 구조는 수정하지 않는다.
    """

    rows = db.execute(
        text(
            """
            SELECT r.role_code
            FROM roles AS r
            INNER JOIN user_roles AS ur
                ON ur.role_id = r.role_id
            WHERE ur.user_id = :user_id
            ORDER BY r.role_id
            """
        ),
        {
            "user_id": user_id,
        },
    ).scalars().all()

    return [
        str(role_code)
        for role_code in rows
    ]


def _make_profile_response(
    user: User,
    roles: list[str],
) -> CustomerProfileResponse:
    """
    User ORM 객체를
    Customer 내 정보 응답 형태로 변환한다.
    """

    return CustomerProfileResponse(
        user_id=user.user_id,
        login_id=user.login_id,
        user_name=user.user_name,
        email=user.email,
        phone=user.phone,
        user_status=user.user_status,
        org_id=user.org_id,
        roles=roles,
    )


def get_customer_profile(
    db: Session,
    user_id: int,
) -> CustomerProfileResponse:
    """
    로그인한 고객의 내 정보 조회.

    JWT에 들어 있는 user_id를 기준으로
    users 테이블에서 본인 정보만 조회한다.
    """

    user = (
        db.query(User)
        .filter(User.user_id == user_id)
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자 정보를 찾을 수 없습니다.",
        )

    roles = _get_user_roles(
        db=db,
        user_id=user.user_id,
    )

    if "BUYER" not in roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="고객 권한이 없는 사용자입니다.",
        )

    return _make_profile_response(
        user=user,
        roles=roles,
    )


def update_customer_profile(
    db: Session,
    user_id: int,
    profile_in: CustomerProfileUpdateRequest,
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

    user = (
        db.query(User)
        .filter(User.user_id == user_id)
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자 정보를 찾을 수 없습니다.",
        )

    roles = _get_user_roles(
        db=db,
        user_id=user.user_id,
    )

    if "BUYER" not in roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="고객 권한이 없는 사용자입니다.",
        )

    update_data = profile_in.model_dump(
        exclude_unset=True,
    )

    # 이름 수정
    if (
        "user_name" in update_data
        and update_data["user_name"] is not None
    ):
        user.user_name = update_data["user_name"]

    # 이메일 수정
    if (
        "email" in update_data
        and update_data["email"] is not None
    ):
        new_email = update_data["email"]

        # 기존 이메일과 다른 이메일로 변경할 경우
        # 다른 사용자가 이미 사용 중인지 확인
        if new_email != user.email:
            existing_email = (
                db.query(User)
                .filter(
                    User.email == new_email,
                    User.user_id != user_id,
                )
                .first()
            )

            if existing_email:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="이미 사용 중인 이메일입니다.",
                )

        user.email = new_email

    # 전화번호 수정
    # phone은 None으로 변경하는 것도 허용
    if "phone" in update_data:
        user.phone = update_data["phone"]

    try:
        db.commit()

    except IntegrityError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="회원 정보 수정 중 중복 데이터가 발생했습니다.",
        ) from exc

    db.refresh(user)

    return _make_profile_response(
        user=user,
        roles=roles,
    )