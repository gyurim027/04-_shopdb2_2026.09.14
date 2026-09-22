"""ORM models for refunds domain (refund_policies, refund_requests, refund_items).

Use Base from app.core.database. Match the existing shopdb2 table/column names;
do not change the database schema for coding convenience.
"""

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Column, BigInteger, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class RefundPolicy(Base):
    __tablename__ = "refund_policies"

    refund_policy_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    # org_units는 명현님 소유(models/users.py) — §10 규칙: ForeignKey() 선언하지 않음.
    org_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    policy_name: Mapped[str] = mapped_column(String(200), nullable=False)
    allowed_days: Mapped[int] = mapped_column(Integer, nullable=False)
    unopened_refund_yn: Mapped[str] = mapped_column(String(1), nullable=False, default="Y")
    opened_refund_yn: Mapped[str] = mapped_column(String(1), nullable=False, default="N")
    defective_refund_yn: Mapped[str] = mapped_column(
        String(1), nullable=False, default="Y"
    )
    # DB enum: BUYER / SELLER / COMPANY
    shipping_fee_payer: Mapped[str] = mapped_column(
        String(20), nullable=False, default="BUYER"
    )
    refund_policy_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    effective_to: Mapped[date | None] = mapped_column(Date, nullable=True)
    active_yn: Mapped[str] = mapped_column(String(1), nullable=False, default="Y")


class RefundRequest(Base):
    __tablename__ = "refund_requests"

    refund_request_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    # orders / users는 명현님 소유 — §10 규칙: ForeignKey() 선언하지 않음.
    order_id: Mapped[int] = mapped_column(Integer, nullable=False)
    buyer_user_id: Mapped[int] = mapped_column(Integer, nullable=False)
    refund_policy_id: Mapped[int | None] = mapped_column(
        ForeignKey("refund_policies.refund_policy_id"), nullable=True
    )
    refund_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    requested_amount: Mapped[Decimal | None] = mapped_column(
        Numeric(15, 2), nullable=True
    )
    approved_amount: Mapped[Decimal | None] = mapped_column(
        Numeric(15, 2), nullable=True
    )
    # DB enum: REQUESTED / REVIEWING / APPROVED / REJECTED / COMPLETED
    refund_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="REQUESTED"
    )
    requested_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class RefundItem(Base):
    __tablename__ = "refund_items"

    refund_item_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    refund_request_id: Mapped[int] = mapped_column(
        ForeignKey("refund_requests.refund_request_id"), nullable=False
    )
    # order_items는 명현님 소유 — §10 규칙: ForeignKey() 선언하지 않음.
    order_item_id: Mapped[int] = mapped_column(Integer, nullable=False)
    refund_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    refund_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)

class ReturnRequest(Base):
    __tablename__ = "return_requests"

    return_request_id = Column(BigInteger, primary_key=True, autoincrement=True)
    order_id = Column(BigInteger, ForeignKey("orders.order_id"), nullable=False)
    return_reason_code = Column(String(50), nullable=False)
    return_reason_detail = Column(String(1000), nullable=True)
    return_status = Column(String(30), nullable=False, default="REQUESTED")
    pickup_method = Column(String(30), nullable=False)
    carrier_name = Column(String(100), nullable=True)
    tracking_no = Column(String(100), nullable=True)
    requested_at = Column(DateTime, server_default=func.now())
    pickup_at = Column(DateTime, nullable=True)
    received_at = Column(DateTime, nullable=True)
    inspected_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    refund_request_id = Column(BigInteger, ForeignKey("refund_requests.refund_request_id"), nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())