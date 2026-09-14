"""ORM models for users/organization domain (org_units, users).

Use Base from app.core.database. Match the existing shopdb2 table/column names;
do not change the database schema for coding convenience.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class OrgUnit(Base):
    __tablename__ = "org_units"

    org_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    parent_org_id: Mapped[int | None] = mapped_column(
        ForeignKey("org_units.org_id"), nullable=True
    )
    org_code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    org_name: Mapped[str] = mapped_column(String(150), nullable=False)
    # DB enum: HEADQUARTER / BRANCH / STORE / WAREHOUSE
    org_type: Mapped[str] = mapped_column(String(20), nullable=False)
    business_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    representative_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    zipcode: Mapped[str | None] = mapped_column(String(20), nullable=True)
    address1: Mapped[str | None] = mapped_column(String(300), nullable=True)
    address2: Mapped[str | None] = mapped_column(String(300), nullable=True)
    active_yn: Mapped[str] = mapped_column(String(1), nullable=False, default="Y")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    org_id: Mapped[int | None] = mapped_column(
        ForeignKey("org_units.org_id"), nullable=True
    )
    login_id: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    user_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    # DB enum: ACTIVE / INACTIVE / SUSPENDED / WITHDRAWN
    user_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="ACTIVE"
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
