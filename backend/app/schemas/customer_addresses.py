from typing import Literal

from pydantic import BaseModel, Field


class CustomerAddressCreateRequest(BaseModel):
    """고객 배송지 등록 요청"""

    address_name: str | None = Field(
        default=None,
        max_length=100,
        description="배송지 이름",
    )

    receiver_name: str | None = Field(
        default=None,
        max_length=100,
        description="받는 사람 이름",
    )

    receiver_phone: str | None = Field(
        default=None,
        max_length=30,
        description="받는 사람 전화번호",
    )

    zipcode: str | None = Field(
        default=None,
        max_length=20,
        description="우편번호",
    )

    address1: str | None = Field(
        default=None,
        max_length=300,
        description="기본 주소",
    )

    address2: str | None = Field(
        default=None,
        max_length=300,
        description="상세 주소",
    )

    default_yn: Literal["Y", "N"] = Field(
        default="N",
        description="기본 배송지 여부",
    )


class CustomerAddressUpdateRequest(BaseModel):
    """고객 배송지 수정 요청"""

    address_name: str | None = Field(
        default=None,
        max_length=100,
    )

    receiver_name: str | None = Field(
        default=None,
        max_length=100,
    )

    receiver_phone: str | None = Field(
        default=None,
        max_length=30,
    )

    zipcode: str | None = Field(
        default=None,
        max_length=20,
    )

    address1: str | None = Field(
        default=None,
        max_length=300,
    )

    address2: str | None = Field(
        default=None,
        max_length=300,
    )

    default_yn: Literal["Y", "N"] | None = None


class CustomerAddressResponse(BaseModel):
    """고객 배송지 응답"""

    address_id: int
    user_id: int

    address_name: str | None = None
    receiver_name: str | None = None
    receiver_phone: str | None = None
    zipcode: str | None = None
    address1: str | None = None
    address2: str | None = None

    default_yn: str