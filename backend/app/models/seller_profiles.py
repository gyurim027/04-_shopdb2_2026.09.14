"""ORM model for seller domain (seller_profiles).

Use Base from app.core.database. Match the existing shopdb2 table/column names;
do not change the database schema for coding convenience.
"""

from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SellerProfile(Base):
    __tablename__ = "seller_profiles"

    seller_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    # users는 명현님 소유(models/users.py) — §10 규칙: ForeignKey() 선언하지 않음.
    user_id: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)
    company_name: Mapped[str] = mapped_column(String(200), nullable=False)
    business_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    representative_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    settlement_bank: Mapped[str | None] = mapped_column(String(100), nullable=True)
    settlement_account: Mapped[str | None] = mapped_column(String(100), nullable=True)
    seller_status: Mapped[str] = mapped_column(String(30), nullable=False, default="ACTIVE")
    created_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
