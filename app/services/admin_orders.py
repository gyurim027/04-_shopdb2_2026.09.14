from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies.auth import AuthContext
from app.models.orders import Order, Payment
from app.models.users import User  # 조직 스코프 필터링용 User 모델 임포트
from app.services.admin_users import get_scoped_org_ids


# 1. 주문 전체 조회 (페이지네이션, 상태 필터링 및 조직 스코프 권한 분기 지원)
def get_orders(
    db: Session,
    auth: AuthContext,
    skip: int = 0,
    limit: int = 10,
    status_filter: str | None = None,
) -> list[Order]:
    query = db.query(Order)
    
    # 조직 스코프 권한 분기 (orders 테이블에 org_id가 없으므로 buyer인 User를 조인하여 org_id 확인)
    scoped = get_scoped_org_ids(db, auth)
    if scoped is not None:
        query = query.join(Order.buyer).filter(User.org_id.in_(scoped or [-1]))

    if status_filter:
        query = query.filter(Order.order_status == status_filter)
        
    return query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()


# 2. 특정 주문 상태 변경
def update_order_status(db: Session, auth: AuthContext, order_id: int, new_status: str) -> Order:
    # 수정: Order.id -> Order.order_id
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="주문을 찾을 수 없습니다."
        )
    
    # 지점장인 경우, 본인 조직 소속의 주문인지 검증 (User 조인을 통해 검증)
    scoped = get_scoped_org_ids(db, auth)
    if scoped is not None:
        buyer = db.query(User).filter(User.user_id == order.buyer_user_id).first()
        if not buyer or buyer.org_id not in scoped:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="해당 주문을 수정할 권한이 없습니다."
            )

    # 수정: status -> order_status
    order.order_status = new_status
    db.commit()
    db.refresh(order)
    return order


# 3. 결제/정산 내역 조회 (조직 스코프 필터링 적용)
def get_settlements(
    db: Session,
    auth: AuthContext,
    skip: int = 0,
    limit: int = 10,
) -> list[Payment]:
    query = db.query(Payment)
    
    # 지점장의 경우 Order 및 User와 조인하여 소속 조직 결제 내역만 필터링
    scoped = get_scoped_org_ids(db, auth)
    if scoped is not None:
        query = query.join(Payment.order).join(Order.buyer).filter(User.org_id.in_(scoped or [-1]))

    return query.order_by(Payment.created_at.desc()).offset(skip).limit(limit).all()