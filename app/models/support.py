from datetime import date, datetime

from sqlalchemy import BigInteger, CHAR, Date, DateTime, String, Text, text
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class BuyerInquiry(Base):
    """구매자 문의 테이블."""

    __tablename__ = "buyer_inquiries"

    inquiry_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )

    user_id: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )

    org_id: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )

    category_code: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    inquiry_status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    secret_yn: Mapped[str] = mapped_column(
        String(1),
        nullable=False,
    )

    answer_content: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    answered_by_user_id: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )

    created_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    answered_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )


class CompanyPolicy(Base):
    """회사 정책 및 정책 버전 테이블."""

    __tablename__ = "company_policies"

    policy_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )

    org_id: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )

    policy_code: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    policy_name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    policy_version: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    policy_type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    policy_content: Mapped[str | None] = mapped_column(
        LONGTEXT,
        nullable=True,
    )

    effective_from: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    effective_to: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    active_yn: Mapped[str | None] = mapped_column(
        CHAR(1),
        nullable=True,
        server_default=text("'Y'"),
    )

    created_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        server_default=text("CURRENT_TIMESTAMP"),
    )