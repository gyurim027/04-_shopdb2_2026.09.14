from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.orders import Order, Payment

# 1. 주문 전체 조회 (페이지네이션 및 상태 필터링 지원)
def get_orders(db: Session, skip: int = 0, limit: int = 10, status_filter: str | None = None):
    query = db.query(Order)
    if status_filter:
        query = query.filter(Order.status == status_filter)
    return query.offset(skip).limit(limit).all()

# 2. 특정 주문 상태 변경
def update_order_status(db: Session, order_id: int, new_status: str):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="주문을 찾을 수 없습니다.")
    
    order.status = new_status
    db.commit()
    db.refresh(order)
    return order

# 3. 결제/정산 내역 조회
def get_settlements(db: Session, skip: int = 0, limit: int = 10):
    return db.query(Payment).offset(skip).limit(limit).all()