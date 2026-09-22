"""Service layer for admin_refunds (refund_policies, refund_requests, refund_items)."""

from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import bindparam, text
from sqlalchemy.orm import Session

from app.dependencies.auth import AuthContext
from app.models.refunds import RefundItem, RefundPolicy, RefundRequest


def get_org_type(db: Session, org_id: int | None) -> str | None:
    if org_id is None:
        return None
    row = db.execute(
        text("SELECT org_type FROM org_units WHERE org_id = :org_id"),
        {"org_id": org_id},
    ).first()
    return row[0] if row else None


def is_super_admin(db: Session, auth: AuthContext) -> bool:
    return get_org_type(db, auth.org_id) == "HEADQUARTER"


def require_super_admin(
    db: Session, auth: AuthContext, detail: str = "최고관리자만 가능한 작업입니다."
) -> None:
    if not is_super_admin(db, auth):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


def get_scoped_org_ids(db: Session, auth: AuthContext) -> list[int] | None:
    """None이면 전체 접근(최고관리자). 아니면 접근 가능한 org_id 목록(자기 조직 + 하위 조직)."""
    if is_super_admin(db, auth):
        return None
    if auth.org_id is None:
        return []
    rows = db.execute(
        text(
            "SELECT org_id FROM org_units "
            "WHERE org_id = :org_id OR parent_org_id = :org_id"
        ),
        {"org_id": auth.org_id},
    ).all()
    return [row[0] for row in rows]


# --- Refund policies -----------------------------------------------------

def list_refund_policies(db: Session, auth: AuthContext) -> list[RefundPolicy]:
    """환불 정책 목록 조회: 최고관리자는 전체, 지점장은 본사 공통(org_id IS NULL 또는 1) 및 자기 조직 정책 조회."""
    query = db.query(RefundPolicy)
    scoped_org_ids = get_scoped_org_ids(db, auth)
    
    if scoped_org_ids is not None:
        allowed_orgs = set(scoped_org_ids) | {1, None}
        query = query.filter(
            (RefundPolicy.org_id.in_(allowed_orgs)) | (RefundPolicy.org_id.is_(None))
        )
    return query.order_by(RefundPolicy.refund_policy_id.desc()).all()


def get_refund_policy(db: Session, refund_policy_id: int, auth: AuthContext) -> RefundPolicy:
    policy = db.get(RefundPolicy, refund_policy_id)
    if policy is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="환불 정책을 찾을 수 없습니다."
        )
    scoped = get_scoped_org_ids(db, auth)
    if scoped is not None and policy.org_id is not None and policy.org_id not in scoped:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="담당 조직의 환불 정책이 아닙니다."
        )
    return policy


def create_refund_policy(db: Session, data: dict, auth: AuthContext) -> RefundPolicy:
    require_super_admin(db, auth, "최고관리자만 환불 정책을 등록할 수 있습니다.")
    policy = RefundPolicy(**data)
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return policy


def update_refund_policy(
    db: Session, refund_policy_id: int, data: dict, auth: AuthContext
) -> RefundPolicy:
    require_super_admin(db, auth, "최고관리자만 환불 정책을 수정할 수 있습니다.")
    policy = get_refund_policy(db, refund_policy_id, auth)
    for key, value in data.items():
        if value is not None:
            setattr(policy, key, value)
    db.commit()
    db.refresh(policy)
    return policy


def deactivate_refund_policy(
    db: Session, refund_policy_id: int, auth: AuthContext
) -> None:
    """실제 삭제가 아니라 active_yn='N' 처리 (소프트 삭제)."""
    require_super_admin(db, auth, "최고관리자만 환불 정책을 삭제할 수 있습니다.")
    policy = get_refund_policy(db, refund_policy_id, auth)
    policy.active_yn = "N"
    db.commit()


# --- Refund requests -------------------------------------------------------

def _get_order_org(db: Session, order_id: int) -> int | None:
    return db.execute(
        text("SELECT org_id FROM orders WHERE order_id = :order_id"),
        {"order_id": order_id},
    ).scalar()


def _assert_request_in_scope(
    db: Session, refund_request: RefundRequest, auth: AuthContext
) -> None:
    scoped = get_scoped_org_ids(db, auth)
    if scoped is None:
        return
    order_org = _get_order_org(db, refund_request.order_id)
    if order_org not in scoped:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="담당 조직의 주문 건이 아닙니다.",
        )


def list_refund_requests(
    db: Session, auth: AuthContext, refund_status: str | None = None
) -> list[RefundRequest]:
    query = db.query(RefundRequest)
    scoped = get_scoped_org_ids(db, auth)
    if scoped is not None:
        stmt = text(
            "order_id IN (SELECT order_id FROM orders WHERE org_id IN :org_ids)"
        ).bindparams(bindparam("org_ids", expanding=True))
        query = query.filter(stmt).params(org_ids=scoped or [-1])
    if refund_status is not None:
        query = query.filter(RefundRequest.refund_status == refund_status)
    return list(query.order_by(RefundRequest.refund_request_id.desc()).all())


def get_refund_request(
    db: Session, refund_request_id: int, auth: AuthContext
) -> RefundRequest:
    refund_request = db.get(RefundRequest, refund_request_id)
    if refund_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="환불 요청을 찾을 수 없습니다."
        )
    _assert_request_in_scope(db, refund_request, auth)
    return refund_request


def approve_refund_request(
    db: Session, refund_request_id: int, approved_amount: Decimal | None, auth: AuthContext
) -> RefundRequest:
    refund_request = get_refund_request(db, refund_request_id, auth)
    refund_request.approved_amount = (
        approved_amount
        if approved_amount is not None
        else refund_request.requested_amount
    )
    refund_request.refund_status = "APPROVED"
    refund_request.approved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(refund_request)
    return refund_request


def reject_refund_request(
    db: Session, refund_request_id: int, auth: AuthContext
) -> RefundRequest:
    refund_request = get_refund_request(db, refund_request_id, auth)
    refund_request.refund_status = "REJECTED"
    db.commit()
    db.refresh(refund_request)
    return refund_request


# --- Refund items ------------------------------------------------------

def list_refund_items(
    db: Session, refund_request_id: int, auth: AuthContext
) -> list[RefundItem]:
    get_refund_request(db, refund_request_id, auth)
    return list(
        db.query(RefundItem)
        .filter(RefundItem.refund_request_id == refund_request_id)
        .order_by(RefundItem.refund_item_id)
        .all()
    )


# --- Exchange requests -----------------------------------------------------

def _assert_exchange_request_in_scope(
    db: Session, exchange_request, auth: AuthContext
) -> None:
    scoped = get_scoped_org_ids(db, auth)
    if scoped is None:
        return
    order_org = _get_order_org(db, exchange_request.order_id)
    if order_org not in scoped:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="담당 조직의 주문 건이 아닙니다.",
        )


def list_exchange_requests(
    db: Session, auth: AuthContext, exchange_status: str | None = None
) -> list:
    """교환 요청 목록을 주문 및 회원 정보와 조인하여 프론트엔드 형식에 맞게 조회"""
    scoped = get_scoped_org_ids(db, auth)
    
    sql = """
        SELECT 
            rr.return_request_id,
            rr.order_id,
            o.buyer_user_id,
            rr.return_reason_code,
            rr.return_reason_detail,
            rr.return_status
        FROM return_requests rr
        JOIN orders o ON rr.order_id = o.order_id
        JOIN users u ON o.buyer_user_id = u.user_id
        WHERE 1=1
    """
    params = {}
    
    if auth.org_id != 1 and scoped is not None and len(scoped) > 0:
        sql += " AND o.org_id IN :org_ids"
        params["org_ids"] = tuple(scoped)
        
    if exchange_status is not None:
        sql += " AND rr.return_status = :exchange_status"
        params["exchange_status"] = exchange_status
        
    sql += " ORDER BY rr.return_request_id DESC"
    
    rows = db.execute(text(sql), params).mappings().all()
    
    return [
        {
            "exchange_request_id": row["return_request_id"],
            "order_id": row["order_id"],
            "buyer_user_id": row["buyer_user_id"],
            "exchange_reason": f"[{row['return_reason_code']}] {row['return_reason_detail'] or ''}",
            "exchange_status": row["return_status"],
        }
        for row in rows
    ]


def get_exchange_request(
    db: Session, exchange_request_id: int, auth: AuthContext
):
    from app.models.refunds import ReturnRequest

    return_request = db.get(ReturnRequest, exchange_request_id)
    if return_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="교환 요청을 찾을 수 없습니다."
        )
    _assert_exchange_request_in_scope(db, return_request, auth)
    return return_request


def approve_exchange_request(
    db: Session, exchange_request_id: int, auth: AuthContext
):
    exchange_request = get_exchange_request(db, exchange_request_id, auth)
    exchange_request.return_status = "APPROVED"  # exchange_status -> return_status 로 수정
    db.commit()
    db.refresh(exchange_request)
    return exchange_request


def reject_exchange_request(
    db: Session, exchange_request_id: int, auth: AuthContext
):
    exchange_request = get_exchange_request(db, exchange_request_id, auth)
    exchange_request.return_status = "REJECTED"  # exchange_status -> return_status 로 수정
    db.commit()
    db.refresh(exchange_request)
    return exchange_request