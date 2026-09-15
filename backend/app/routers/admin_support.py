from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import AuthContext, require_admin
from app.schemas.admin_support import (
    InquiryAnswerRequest,
    InquiryAnswerResponse,
    InquiryListResponse,
    InquiryResponse,
    PolicyCreateRequest,
    PolicyDeactivateResponse,
    PolicyListResponse,
    PolicyResponse,
    PolicyVersionCreateRequest,
)
from app.services.admin_support import (
    answer_inquiry,
    create_policy,
    create_policy_version,
    deactivate_policy,
    get_inquiry_by_id,
    get_inquiry_list,
    get_policy_by_id,
    get_policy_list,
)


router = APIRouter(
    prefix="/admin/support",
    tags=["Admin Support"],
)


# =========================================================
# 문의 관리
# =========================================================


@router.get(
    "/inquiries",
    response_model=InquiryListResponse,
)
def list_inquiries(
    skip: int = Query(
        default=0,
        ge=0,
    ),
    limit: int = Query(
        default=100,
        ge=1,
        le=500,
    ),
    inquiry_status: str | None = Query(
        default=None,
    ),
    category_code: str | None = Query(
        default=None,
    ),
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> InquiryListResponse:
    """관리자 문의 목록 조회."""

    total, items = get_inquiry_list(
        db,
        skip=skip,
        limit=limit,
        inquiry_status=inquiry_status,
        category_code=category_code,
        org_id=auth.org_id,
    )

    return InquiryListResponse(
        total=total,
        items=items,
    )


@router.get(
    "/inquiries/{inquiry_id}",
    response_model=InquiryResponse,
)
def get_inquiry(
    inquiry_id: int,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> InquiryResponse:
    """문의 상세 조회."""

    inquiry = get_inquiry_by_id(
        db,
        inquiry_id,
    )

    if inquiry is None:
        raise HTTPException(
            status_code=404,
            detail="문의를 찾을 수 없습니다.",
        )

    if (
        auth.org_id is not None
        and inquiry.org_id is not None
        and inquiry.org_id != auth.org_id
    ):
        raise HTTPException(
            status_code=403,
            detail="해당 문의에 접근할 권한이 없습니다.",
        )

    return inquiry


@router.post(
    "/inquiries/{inquiry_id}/answer",
    response_model=InquiryAnswerResponse,
)
def create_inquiry_answer(
    inquiry_id: int,
    request: InquiryAnswerRequest,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> InquiryAnswerResponse:
    """관리자가 문의에 답변."""

    existing = get_inquiry_by_id(
        db,
        inquiry_id,
    )

    if existing is None:
        raise HTTPException(
            status_code=404,
            detail="문의를 찾을 수 없습니다.",
        )

    if (
        auth.org_id is not None
        and existing.org_id is not None
        and existing.org_id != auth.org_id
    ):
        raise HTTPException(
            status_code=403,
            detail="해당 문의에 접근할 권한이 없습니다.",
        )

    inquiry = answer_inquiry(
        db,
        inquiry_id=inquiry_id,
        answer_content=request.answer_content,
        answered_by_user_id=auth.user_id,
    )

    if inquiry is None:
        raise HTTPException(
            status_code=404,
            detail="문의를 찾을 수 없습니다.",
        )

    return InquiryAnswerResponse(
        message="문의 답변이 등록되었습니다.",
        inquiry=inquiry,
    )


# =========================================================
# 회사 정책 관리
# =========================================================


@router.get(
    "/policies",
    response_model=PolicyListResponse,
)
def list_policies(
    skip: int = Query(
        default=0,
        ge=0,
    ),
    limit: int = Query(
        default=100,
        ge=1,
        le=500,
    ),
    policy_code: str | None = Query(
        default=None,
    ),
    policy_type: str | None = Query(
        default=None,
    ),
    active_yn: str | None = Query(
        default=None,
    ),
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> PolicyListResponse:
    """회사 정책 및 버전 목록 조회."""

    total, items = get_policy_list(
        db,
        skip=skip,
        limit=limit,
        policy_code=policy_code,
        policy_type=policy_type,
        active_yn=active_yn,
        org_id=auth.org_id,
    )

    return PolicyListResponse(
        total=total,
        items=items,
    )


@router.get(
    "/policies/{policy_id}",
    response_model=PolicyResponse,
)
def get_policy(
    policy_id: int,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> PolicyResponse:
    """정책 상세 조회."""

    policy = get_policy_by_id(
        db,
        policy_id,
    )

    if policy is None:
        raise HTTPException(
            status_code=404,
            detail="정책을 찾을 수 없습니다.",
        )

    if (
        auth.org_id is not None
        and policy.org_id is not None
        and policy.org_id != auth.org_id
    ):
        raise HTTPException(
            status_code=403,
            detail="해당 정책에 접근할 권한이 없습니다.",
        )

    return policy


@router.post(
    "/policies",
    response_model=PolicyResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_new_policy(
    request: PolicyCreateRequest,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> PolicyResponse:
    """새 회사 정책 생성."""

    try:
        policy = create_policy(
            db,
            request,
            default_org_id=auth.org_id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    return policy


@router.post(
    "/policies/{policy_id}/versions",
    response_model=PolicyResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_new_policy_version(
    policy_id: int,
    request: PolicyVersionCreateRequest,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> PolicyResponse:
    """기존 정책을 기준으로 새 버전 생성."""

    source_policy = get_policy_by_id(
        db,
        policy_id,
    )

    if source_policy is None:
        raise HTTPException(
            status_code=404,
            detail="기준 정책을 찾을 수 없습니다.",
        )

    if (
        auth.org_id is not None
        and source_policy.org_id is not None
        and source_policy.org_id != auth.org_id
    ):
        raise HTTPException(
            status_code=403,
            detail="해당 정책에 접근할 권한이 없습니다.",
        )

    try:
        policy = create_policy_version(
            db,
            source_policy_id=policy_id,
            policy_version=request.policy_version,
            effective_from=request.effective_from,
            effective_to=request.effective_to,
            policy_content=request.policy_content,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    if policy is None:
        raise HTTPException(
            status_code=404,
            detail="기준 정책을 찾을 수 없습니다.",
        )

    return policy


@router.delete(
    "/policies/{policy_id}",
    response_model=PolicyDeactivateResponse,
)
def delete_policy(
    policy_id: int,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> PolicyDeactivateResponse:
    """정책을 실제 삭제하지 않고 비활성화."""

    existing = get_policy_by_id(
        db,
        policy_id,
    )

    if existing is None:
        raise HTTPException(
            status_code=404,
            detail="정책을 찾을 수 없습니다.",
        )

    if (
        auth.org_id is not None
        and existing.org_id is not None
        and existing.org_id != auth.org_id
    ):
        raise HTTPException(
            status_code=403,
            detail="해당 정책에 접근할 권한이 없습니다.",
        )

    policy = deactivate_policy(
        db,
        policy_id,
    )

    if policy is None:
        raise HTTPException(
            status_code=404,
            detail="정책을 찾을 수 없습니다.",
        )

    return PolicyDeactivateResponse(
        message="정책이 비활성화되었습니다.",
        policy_id=policy.policy_id,
        active_yn=policy.active_yn or "N",
    )