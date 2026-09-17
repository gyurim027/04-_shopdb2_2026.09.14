"""Router for Admin Orders & Payments domain."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.dependencies.auth import AuthContext, require_admin
from app.schemas.admin_orders import OrderResponse, OrderStatusUpdate, SettlementResponse
from app.services import admin_orders as order_service

router = APIRouter(
    prefix="/admin/orders",  # main.py의 prefix(/api)와 합쳐져서 최종적으로 /api/admin/orders가 됩니다.
    tags=["Admin Orders & Payments"]
)

# 1. 주문 전체 조회/관리 API (최고관리자: 전체, 지점장: 소속 지사만 필터링)
@router.get("", response_model=List[OrderResponse])
def read_orders(
    skip: int = Query(0, description="건너뛸 데이터 수"),
    limit: int = Query(10, description="가져올 데이터 수"),
    status: str | None = Query(None, description="주문 상태 필터"),
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
):
    return order_service.get_orders(db=db, auth=auth, skip=skip, limit=limit, status_filter=status)

# 2. 주문 상태 변경 API (최고관리자 및 소속 지점장 권한 검증 포함)
@router.patch("/{order_id}/status", response_model=OrderResponse)
def change_order_status(
    order_id: int,
    body: OrderStatusUpdate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
):
    return order_service.update_order_status(db=db, auth=auth, order_id=order_id, new_status=body.status)

# 3. 결제/정산 내역 조회 API
@router.get("/settlements", response_model=List[SettlementResponse])
def read_settlements(
    skip: int = Query(0, description="건너뛸 데이터 수"),
    limit: int = Query(10, description="가져올 데이터 수"),
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
):
    return order_service.get_settlements(db=db, auth=auth, skip=skip, limit=limit)