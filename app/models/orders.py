from sqlalchemy import Column, Integer, String, DateTime, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Order(Base):
    __tablename__ = "orders"

    order_id = Column(Integer, primary_key=True, index=True)
    buyer_user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    order_status = Column(String(50), nullable=False, default="PENDING")  # 주문 상태
    total_amount = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    # 관계 설정
    payments = relationship("Payment", back_populates="order", cascade="all, delete-orphan")
    buyer = relationship("User", foreign_keys=[buyer_user_id])


class Payment(Base):
    __tablename__ = "payments"

    payment_id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.order_id"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    payment_status = Column(String(50), nullable=False)  # 결제 상태 (PAID, FAILED 등)
    payment_method = Column(String(50), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)  # 승인 일시
    receipt_url = Column(String(255), nullable=True)  # 영수증 URL
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="payments")