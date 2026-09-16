from sqlalchemy import Column, BigInteger, String, DateTime, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Order(Base):
    __tablename__ = "orders"

    order_id = Column(BigInteger, primary_key=True, index=True)
    order_no = Column(String(64), nullable=False, unique=True)
    buyer_user_id = Column(BigInteger, ForeignKey("users.user_id"), nullable=False)
    org_id = Column(BigInteger, ForeignKey("org_units.org_id"), nullable=False)
    order_status = Column(String(50), nullable=False, default="ORDERED")
    product_amount = Column(Numeric(15, 2), nullable=False)
    discount_amount = Column(Numeric(15, 2), default=0.00)
    shipping_amount = Column(Numeric(15, 2), default=0.00)
    total_amount = Column(Numeric(15, 2), nullable=False)
    receiver_name = Column(String(100), nullable=True)
    receiver_phone = Column(String(30), nullable=True)
    zipcode = Column(String(20), nullable=True)
    shipping_address1 = Column(String(300), nullable=True)
    shipping_address2 = Column(String(300), nullable=True)
    ordered_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    # 관계 설정
    payments = relationship("Payment", back_populates="order", cascade="all, delete-orphan")
    buyer = relationship("User", foreign_keys=[buyer_user_id])


class Payment(Base):
    __tablename__ = "payments"

    payment_id = Column(BigInteger, primary_key=True, index=True)
    order_id = Column(BigInteger, ForeignKey("orders.order_id"), nullable=False)
    pg_provider = Column(String(50), nullable=False)
    payment_key = Column(String(255), unique=True, nullable=True)
    pg_order_id = Column(String(255), nullable=True)
    customer_key = Column(String(255), nullable=True)
    payment_type = Column(String(50), nullable=True)
    payment_method = Column(String(100), nullable=True)
    payment_status = Column(String(50), nullable=True)
    requested_amount = Column(Numeric(15, 2), nullable=False)
    approved_amount = Column(Numeric(15, 2), default=0.00)
    cancelled_amount = Column(Numeric(15, 2), default=0.00)
    balance_amount = Column(Numeric(15, 2), default=0.00)
    currency = Column(String(10), default="KRW")
    receipt_url = Column(String(2000), nullable=True)
    requested_at = Column(DateTime(timezone=True), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="payments")