from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.dependencies.auth import AuthContext
from app.models.orders import Order, Payment
from app.services.admin_users import get_scoped_org_ids


# 1. 주문 전체 조회 (페이지네이션, 상태 필터링 및 조직 스코프 권한 분기 지원)
def get_orders(
    db: Session,
    auth: AuthContext,
    skip: int = 0,
    limit: int = 10,
    status_filter: str | None = None,
) -> list[Order]:
    # 💡 joinedload(Order.order_items)를 추가하여 주문에 속한 상품 정보들을 함께 로드합니다.
    query = db.query(Order).options(joinedload(Order.order_items))
    
    # 수정: 이제 Order 테이블에 org_id가 존재하므로 User 조인 불필요
    scoped = get_scoped_org_ids(db, auth)
    if scoped is not None:
        query = query.filter(Order.org_id.in_(scoped or [-1]))

    if status_filter:
        query = query.filter(Order.order_status == status_filter)
        
    return query.order_by(Order.updated_at.desc()).offset(skip).limit(limit).all()


# 2. 특정 주문 상태 변경
def update_order_status(db: Session, auth: AuthContext, order_id: int, new_status: str) -> Order:
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="주문을 찾을 수 없습니다."
        )
    
    # 수정: User를 조회할 필요 없이 Order 객체의 org_id를 직접 확인
    scoped = get_scoped_org_ids(db, auth)
    if scoped is not None:
        if order.org_id not in scoped:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="해당 주문을 수정할 권한이 없습니다."
            )

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
    
    # 수정: Order에 org_id가 있으므로 User까지 조인할 필요 없이 Order만 조인하여 필터링
    scoped = get_scoped_org_ids(db, auth)
    if scoped is not None:
        query = query.join(Payment.order).filter(Order.org_id.in_(scoped or [-1]))

    return query.order_by(Payment.created_at.desc()).offset(skip).limit(limit).all()