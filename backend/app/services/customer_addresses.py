from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.schemas.customer_addresses import (
    CustomerAddressCreateRequest,
    CustomerAddressResponse,
    CustomerAddressUpdateRequest,
)


def _get_address(
    db: Session,
    user_id: int,
    address_id: int,
):
    """
    특정 배송지를 조회한다.

    반드시 user_id 조건을 함께 사용해서
    다른 고객의 배송지를 조회하거나 수정하지 못하게 한다.
    """

    address = db.execute(
        text(
            """
            SELECT
                address_id,
                user_id,
                address_name,
                receiver_name,
                receiver_phone,
                zipcode,
                address1,
                address2,
                default_yn
            FROM user_addresses
            WHERE address_id = :address_id
              AND user_id = :user_id
            """
        ),
        {
            "address_id": address_id,
            "user_id": user_id,
        },
    ).mappings().first()

    if address is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="배송지를 찾을 수 없습니다.",
        )

    return address


def _make_address_response(
    address,
) -> CustomerAddressResponse:
    """
    DB 조회 결과를 CustomerAddressResponse 형태로 변환한다.
    """

    return CustomerAddressResponse(
        address_id=address["address_id"],
        user_id=address["user_id"],
        address_name=address["address_name"],
        receiver_name=address["receiver_name"],
        receiver_phone=address["receiver_phone"],
        zipcode=address["zipcode"],
        address1=address["address1"],
        address2=address["address2"],
        default_yn=address["default_yn"],
    )


def get_customer_addresses(
    db: Session,
    user_id: int,
) -> list[CustomerAddressResponse]:
    """
    로그인한 고객의 배송지 목록 조회.

    다른 사용자의 배송지는 조회하지 않는다.
    """

    addresses = db.execute(
        text(
            """
            SELECT
                address_id,
                user_id,
                address_name,
                receiver_name,
                receiver_phone,
                zipcode,
                address1,
                address2,
                default_yn
            FROM user_addresses
            WHERE user_id = :user_id
            ORDER BY
                CASE
                    WHEN default_yn = 'Y' THEN 0
                    ELSE 1
                END,
                address_id DESC
            """
        ),
        {
            "user_id": user_id,
        },
    ).mappings().all()

    return [
        _make_address_response(address)
        for address in addresses
    ]


def create_customer_address(
    db: Session,
    user_id: int,
    address_in: CustomerAddressCreateRequest,
) -> CustomerAddressResponse:
    """
    고객 배송지 등록.

    동작:
    1. 현재 고객의 기존 배송지 개수를 확인한다.
    2. 첫 번째 배송지는 자동으로 기본 배송지(Y)가 된다.
    3. 새 배송지를 기본 배송지로 등록하면
       기존 기본 배송지는 모두 N으로 변경한다.
    4. 기존 user_addresses 테이블에 INSERT 한다.
    """

    address_count = db.execute(
        text(
            """
            SELECT COUNT(*)
            FROM user_addresses
            WHERE user_id = :user_id
            """
        ),
        {
            "user_id": user_id,
        },
    ).scalar_one()

    # 첫 배송지는 자동으로 기본 배송지
    if address_count == 0:
        default_yn = "Y"
    else:
        default_yn = address_in.default_yn

    try:
        # 새로운 기본 배송지를 등록하는 경우
        # 기존 배송지는 기본 배송지 해제
        if default_yn == "Y":
            db.execute(
                text(
                    """
                    UPDATE user_addresses
                    SET default_yn = 'N'
                    WHERE user_id = :user_id
                    """
                ),
                {
                    "user_id": user_id,
                },
            )

        result = db.execute(
            text(
                """
                INSERT INTO user_addresses (
                    user_id,
                    address_name,
                    receiver_name,
                    receiver_phone,
                    zipcode,
                    address1,
                    address2,
                    default_yn
                )
                VALUES (
                    :user_id,
                    :address_name,
                    :receiver_name,
                    :receiver_phone,
                    :zipcode,
                    :address1,
                    :address2,
                    :default_yn
                )
                """
            ),
            {
                "user_id": user_id,
                "address_name": address_in.address_name,
                "receiver_name": address_in.receiver_name,
                "receiver_phone": address_in.receiver_phone,
                "zipcode": address_in.zipcode,
                "address1": address_in.address1,
                "address2": address_in.address2,
                "default_yn": default_yn,
            },
        )

        address_id = result.lastrowid

        db.commit()

    except Exception:
        db.rollback()
        raise

    address = _get_address(
        db=db,
        user_id=user_id,
        address_id=address_id,
    )

    return _make_address_response(address)


def update_customer_address(
    db: Session,
    user_id: int,
    address_id: int,
    address_in: CustomerAddressUpdateRequest,
) -> CustomerAddressResponse:
    """
    고객 배송지 수정.

    address_id뿐만 아니라 user_id를 함께 확인해서
    반드시 본인의 배송지만 수정할 수 있다.
    """

    current_address = _get_address(
        db=db,
        user_id=user_id,
        address_id=address_id,
    )

    update_data = address_in.model_dump(
        exclude_unset=True,
    )

    # 아무 값도 전달하지 않았다면 기존 배송지 그대로 반환
    if not update_data:
        return _make_address_response(current_address)

    allowed_columns = {
        "address_name",
        "receiver_name",
        "receiver_phone",
        "zipcode",
        "address1",
        "address2",
        "default_yn",
    }

    update_data = {
        key: value
        for key, value in update_data.items()
        if key in allowed_columns
    }

    try:
        # 이 주소를 기본 배송지로 지정하면
        # 다른 배송지는 모두 N 처리
        if update_data.get("default_yn") == "Y":
            db.execute(
                text(
                    """
                    UPDATE user_addresses
                    SET default_yn = 'N'
                    WHERE user_id = :user_id
                      AND address_id != :address_id
                    """
                ),
                {
                    "user_id": user_id,
                    "address_id": address_id,
                },
            )

        set_clauses = []
        params = {
            "user_id": user_id,
            "address_id": address_id,
        }

        for column, value in update_data.items():
            set_clauses.append(
                f"{column} = :{column}"
            )
            params[column] = value

        if set_clauses:
            sql = f"""
                UPDATE user_addresses
                SET {", ".join(set_clauses)}
                WHERE address_id = :address_id
                  AND user_id = :user_id
            """

            db.execute(
                text(sql),
                params,
            )

        db.commit()

    except Exception:
        db.rollback()
        raise

    updated_address = _get_address(
        db=db,
        user_id=user_id,
        address_id=address_id,
    )

    return _make_address_response(updated_address)


def delete_customer_address(
    db: Session,
    user_id: int,
    address_id: int,
) -> None:
    """
    고객 배송지 삭제.

    기존 user_addresses 테이블에는
    삭제 여부(active_yn 등) 컬럼이 없기 때문에
    실제 DELETE를 사용한다.

    삭제한 주소가 기본 배송지였다면
    남아 있는 배송지 중 하나를 새 기본 배송지로 지정한다.
    """

    current_address = _get_address(
        db=db,
        user_id=user_id,
        address_id=address_id,
    )

    was_default = (
        current_address["default_yn"] == "Y"
    )

    try:
        db.execute(
            text(
                """
                DELETE FROM user_addresses
                WHERE address_id = :address_id
                  AND user_id = :user_id
                """
            ),
            {
                "address_id": address_id,
                "user_id": user_id,
            },
        )

        # 기본 배송지를 삭제했다면
        # 남아 있는 가장 최근 배송지를 기본 배송지로 지정
        if was_default:
            next_address_id = db.execute(
                text(
                    """
                    SELECT address_id
                    FROM user_addresses
                    WHERE user_id = :user_id
                    ORDER BY address_id DESC
                    LIMIT 1
                    """
                ),
                {
                    "user_id": user_id,
                },
            ).scalar_one_or_none()

            if next_address_id is not None:
                db.execute(
                    text(
                        """
                        UPDATE user_addresses
                        SET default_yn = 'Y'
                        WHERE address_id = :address_id
                          AND user_id = :user_id
                        """
                    ),
                    {
                        "address_id": next_address_id,
                        "user_id": user_id,
                    },
                )

        db.commit()

    except Exception:
        db.rollback()
        raise