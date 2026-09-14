from datetime import date, datetime

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.support import BuyerInquiry, CompanyPolicy
from app.schemas.admin_support import PolicyCreateRequest


# =========================================================
# 문의 관리
# =========================================================


def get_inquiry_by_id(
    db: Session,
    inquiry_id: int,
) -> BuyerInquiry | None:
    """문의 1개 조회."""

    return db.get(BuyerInquiry, inquiry_id)


def get_inquiry_list(
    db: Session,
    *,
    skip: int = 0,
    limit: int = 100,
    inquiry_status: str | None = None,
    category_code: str | None = None,
    org_id: int | None = None,
) -> tuple[int, list[BuyerInquiry]]:
    """관리자 문의 목록 조회."""

    conditions = []

    if inquiry_status:
        conditions.append(
            BuyerInquiry.inquiry_status == inquiry_status
        )

    if category_code:
        conditions.append(
            BuyerInquiry.category_code == category_code
        )

    if org_id is not None:
        conditions.append(
            BuyerInquiry.org_id == org_id
        )

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
    *,
    inquiry_id: int,
    answer_content: str,
    answered_by_user_id: int,
) -> BuyerInquiry | None:
    """관리자가 문의에 답변."""

    inquiry = db.get(
        BuyerInquiry,
        inquiry_id,
    )

    if inquiry is None:
        return None

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
    *,
    skip: int = 0,
    limit: int = 100,
    policy_code: str | None = None,
    policy_type: str | None = None,
    active_yn: str | None = None,
    org_id: int | None = None,
) -> tuple[int, list[CompanyPolicy]]:
    """정책 및 정책 버전 목록 조회."""

    conditions = []

    if policy_code:
        conditions.append(
            CompanyPolicy.policy_code == policy_code
        )

    if policy_type:
        conditions.append(
            CompanyPolicy.policy_type == policy_type
        )

    if active_yn:
        conditions.append(
            CompanyPolicy.active_yn == active_yn
        )

    if org_id is not None:
        conditions.append(
            CompanyPolicy.org_id == org_id
        )

    count_query = select(
        func.count(CompanyPolicy.policy_id)
    )

    if conditions:
        count_query = count_query.where(*conditions)

    total = db.scalar(count_query) or 0

    query = (
        select(CompanyPolicy)
        .order_by(
            CompanyPolicy.policy_code.asc(),
            CompanyPolicy.effective_from.desc(),
            CompanyPolicy.policy_id.desc(),
        )
        .offset(skip)
        .limit(limit)
    )

    if conditions:
        query = query.where(*conditions)

    items = list(
        db.scalars(query).all()
    )

    return total, items


def create_policy(
    db: Session,
    request: PolicyCreateRequest,
    *,
    default_org_id: int | None = None,
) -> CompanyPolicy:
    """새 회사 정책 생성."""

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
    *,
    source_policy_id: int,
    policy_version: str,
    effective_from: date,
    effective_to: date | None = None,
    policy_content: str | None = None,
) -> CompanyPolicy | None:
    """기존 정책을 기준으로 새로운 버전을 생성."""

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
) -> CompanyPolicy | None:
    """정책을 삭제하지 않고 비활성화."""

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