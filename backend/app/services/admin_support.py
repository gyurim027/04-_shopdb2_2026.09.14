from datetime import date, datetime

from fastapi import HTTPException, status
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.dependencies.auth import AuthContext
from app.models.support import BuyerInquiry, CompanyPolicy
from app.models.users import OrgUnit
from app.schemas.admin_support import PolicyCreateRequest


def get_org_type(db: Session, org_id: int | None) -> str | None:
    if org_id is None:
        return None
    row = db.execute(
        text("SELECT org_type FROM org_units WHERE org_id = :org_id"),
        {"org_id": org_id},
    ).first()
    return row[0] if row else None


def is_super_admin(db: Session, auth: AuthContext | None) -> bool:
    if auth is None or auth.org_id is None:
        return True
    if auth.org_id == 1:
        return True
    org = db.get(OrgUnit, auth.org_id)
    return org is not None and (org.org_type == "HEADQUARTER" or org.org_id == 1)


def get_scoped_org_ids(db: Session, auth: AuthContext | None) -> list[int] | None:
    """None이면 전체 접근(최고관리자). 아니면 접근 가능한 org_id 목록(자기 조직 + 하위 조직)."""
    if auth is None or is_super_admin(db, auth):
        return None
    if auth.org_id is None:
        return []
    rows = (
        db.query(OrgUnit.org_id)
        .filter((OrgUnit.org_id == auth.org_id) | (OrgUnit.parent_org_id == auth.org_id))
        .all()
    )
    return [row[0] for row in rows]


# =========================================================
# 문의 관리
# =========================================================


def get_inquiry_by_id(
    db: Session,
    inquiry_id: int,
    auth: AuthContext | None = None,
) -> BuyerInquiry | None:
    """문의 1개 조회 (조직 스코프 검증 포함)."""
    inquiry = db.get(BuyerInquiry, inquiry_id)
    if inquiry is None:
        return None
        
    scoped = get_scoped_org_ids(db, auth)
    if scoped is not None:
        if inquiry.org_id not in scoped:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="해당 문의를 조회할 권한이 없습니다."
            )
    return inquiry


def get_inquiry_list(
    db: Session,
    auth: AuthContext | None = None,
    *,
    skip: int = 0,
    limit: int = 1000,
    inquiry_status: str | None = None,
    category_code: str | None = None,
    org_id: int | None = None,
) -> tuple[int, list[BuyerInquiry]]:
    """관리자 문의 목록 조회 (조직 스코프 강제 적용)."""

    conditions = []

    if inquiry_status:
        conditions.append(
            BuyerInquiry.inquiry_status == inquiry_status
        )

    if category_code:
        conditions.append(
            BuyerInquiry.category_code == category_code
        )

    scoped = get_scoped_org_ids(db, auth)
    if scoped is not None:
        if org_id is not None:
            if org_id not in scoped:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="해당 조직의 문의를 조회할 권한이 없습니다."
                )
            conditions.append(BuyerInquiry.org_id == org_id)
        else:
            conditions.append(BuyerInquiry.org_id.in_(scoped or [-1]))
    else:
        if org_id is not None:
            conditions.append(BuyerInquiry.org_id == org_id)

    count_query = select(
        func.count(BuyerInquiry.inquiry_id)
    )

    if conditions:
        count_query = count_query.where(*conditions)

    total = db.scalar(count_query) or 0

    query = (
        select(BuyerInquiry)
        .order_by(BuyerInquiry.inquiry_id.desc())
        .offset(skip)
        .limit(limit)
    )

    if conditions:
        query = query.where(*conditions)

    items = list(
        db.scalars(query).all()
    )

    return total, items


def answer_inquiry(
    db: Session,
    auth: AuthContext | None = None,
    *,
    inquiry_id: int,
    answer_content: str,
    answered_by_user_id: int,
) -> BuyerInquiry | None:
    """관리자가 문의에 답변 (조직 스코프 검증 포함)."""

    inquiry = db.get(
        BuyerInquiry,
        inquiry_id,
    )

    if inquiry is None:
        return None

    scoped = get_scoped_org_ids(db, auth)
    if scoped is not None and inquiry.org_id not in scoped:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="해당 문의에 답변할 권한이 없습니다."
        )

    now = datetime.now()

    inquiry.answer_content = answer_content
    inquiry.answered_by_user_id = answered_by_user_id
    inquiry.answered_at = now
    inquiry.updated_at = now
    inquiry.inquiry_status = "ANSWERED"

    db.commit()
    db.refresh(inquiry)

    return inquiry


# =========================================================
# 회사 정책 관리
# =========================================================


def get_policy_by_id(
    db: Session,
    policy_id: int,
) -> CompanyPolicy | None:
    """정책 1개 조회."""

    return db.get(
        CompanyPolicy,
        policy_id,
    )

def get_policy_list(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    policy_code: str | None = None,
    policy_type: str | None = None,
    active_yn: str | None = None,
    org_id: int | None = None,
) -> tuple[int, list[CompanyPolicy]]:
    """회사 정책 목록 조회: 본사 공통 및 지점 소속 정책 모두 조회 가능하도록 수정."""
    query = db.query(CompanyPolicy)

    # 지점장인 경우 본사(org_id=1 또는 NULL) 및 본인 조직 정책 허용
    if org_id is not None and org_id != 1:
        query = query.filter(
            (CompanyPolicy.org_id == org_id) | 
            (CompanyPolicy.org_id == 1) | 
            (CompanyPolicy.org_id.is_(None))
        )

    if policy_code:
        query = query.filter(CompanyPolicy.policy_code == policy_code)
    if policy_type:
        query = query.filter(CompanyPolicy.policy_type == policy_type)
    if active_yn:
        query = query.filter(CompanyPolicy.active_yn == active_yn)

    total = query.count()
    items = (
        query.order_by(CompanyPolicy.policy_id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return total, items


def create_policy(
    db: Session,
    request: PolicyCreateRequest,
    auth: AuthContext | None = None,
    *,
    default_org_id: int | None = None,
) -> CompanyPolicy:
    """새 회사 정책 생성 (최고관리자 전용 권한 체크 추가)."""
    if auth is not None and not is_super_admin(db, auth):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="최고관리자만 정책을 생성할 수 있습니다."
        )

    if (
        request.effective_to is not None
        and request.effective_to < request.effective_from
    ):
        raise ValueError(
            "정책 종료일은 시작일보다 빠를 수 없습니다."
        )

    org_id = (
        request.org_id
        if request.org_id is not None
        else default_org_id
    )

    policy = CompanyPolicy(
        org_id=org_id,
        policy_code=request.policy_code,
        policy_name=request.policy_name,
        policy_version=request.policy_version,
        policy_type=request.policy_type,
        policy_content=request.policy_content,
        effective_from=request.effective_from,
        effective_to=request.effective_to,
        active_yn="Y",
    )

    try:
        db.add(policy)
        db.commit()
        db.refresh(policy)

    except IntegrityError as exc:
        db.rollback()

        raise ValueError(
            "동일한 정책 코드와 버전이 이미 존재합니다."
        ) from exc

    return policy


def create_policy_version(
    db: Session,
    auth: AuthContext | None = None,
    *,
    source_policy_id: int,
    policy_version: str,
    effective_from: date,
    effective_to: date | None = None,
    policy_content: str | None = None,
) -> CompanyPolicy | None:
    """기존 정책을 기준으로 새로운 버전을 생성 (최고관리자 전용)."""
    if auth is not None and not is_super_admin(db, auth):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="최고관리자만 정책 버전을 생성할 수 있습니다."
        )

    source = db.get(
        CompanyPolicy,
        source_policy_id,
    )

    if source is None:
        return None

    if (
        effective_to is not None
        and effective_to < effective_from
    ):
        raise ValueError(
            "정책 종료일은 시작일보다 빠를 수 없습니다."
        )

    new_policy = CompanyPolicy(
        org_id=source.org_id,
        policy_code=source.policy_code,
        policy_name=source.policy_name,
        policy_version=policy_version,
        policy_type=source.policy_type,
        policy_content=(
            policy_content
            if policy_content is not None
            else source.policy_content
        ),
        effective_from=effective_from,
        effective_to=effective_to,
        active_yn="Y",
    )

    try:
        db.add(new_policy)
        db.commit()
        db.refresh(new_policy)

    except IntegrityError as exc:
        db.rollback()

        raise ValueError(
            "동일한 정책 코드와 버전이 이미 존재합니다."
        ) from exc

    return new_policy


def deactivate_policy(
    db: Session,
    policy_id: int,
    auth: AuthContext | None = None,
) -> CompanyPolicy | None:
    """정책을 삭제하지 않고 비활성화 (최고관리자 전용)."""
    if auth is not None and not is_super_admin(db, auth):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="최고관리자만 정책을 비활성화할 수 있습니다."
        )

    policy = db.get(
        CompanyPolicy,
        policy_id,
    )

    if policy is None:
        return None

    policy.active_yn = "N"

    db.commit()
    db.refresh(policy)

    return policy