from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import AuthContext, require_admin
from app.schemas.admin_ai import (
    AIProviderCreateRequest,
    AIProviderListResponse,
    AIProviderResponse,
    AIProviderUpdateRequest,
    AIQualityMonitoringResponse,
    AIQueryToInquiryRequest,
    AIQueryToInquiryResponse,
    RAGDocumentCreateRequest,
    RAGDocumentListResponse,
    RAGDocumentResponse,
    RAGDocumentStatusUpdateRequest,
    RAGQueryLogCreateRequest,
    RAGQueryLogListResponse,
    RAGQueryLogResponse,
)
from app.services.admin_ai import (
    convert_query_log_to_inquiry,
    create_provider,
    create_query_log,
    create_rag_document,
    get_provider_by_id,
    get_provider_list,
    get_quality_monitoring,
    get_query_log_by_id,
    get_query_log_list,
    get_rag_document_by_id,
    get_rag_document_list,
    update_provider,
    update_rag_document_status,
)


router = APIRouter(
    prefix="/admin/ai",
    tags=["Admin AI"],
)


# =========================================================
# AI Provider 관리
# =========================================================


@router.get(
    "/providers",
    response_model=AIProviderListResponse,
)
def list_providers(
    skip: int = Query(
        default=0,
        ge=0,
    ),
    limit: int = Query(
        default=100,
        ge=1,
        le=500,
    ),
    provider_type: str | None = Query(
        default=None,
    ),
    active_yn: str | None = Query(
        default=None,
    ),
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> AIProviderListResponse:
    """AI Provider 목록 조회."""

    total, items = get_provider_list(
        db,
        skip=skip,
        limit=limit,
        provider_type=provider_type,
        active_yn=active_yn,
    )

    return AIProviderListResponse(
        total=total,
        items=items,
    )


@router.get(
    "/providers/{provider_id}",
    response_model=AIProviderResponse,
)
def get_provider(
    provider_id: int,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> AIProviderResponse:
    """AI Provider 상세 조회."""

    provider = get_provider_by_id(
        db,
        provider_id,
    )

    if provider is None:
        raise HTTPException(
            status_code=404,
            detail="AI Provider를 찾을 수 없습니다.",
        )

    return provider


@router.post(
    "/providers",
    response_model=AIProviderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_new_provider(
    request: AIProviderCreateRequest,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> AIProviderResponse:
    """AI Provider 등록."""

    try:
        provider = create_provider(
            db,
            request,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    return provider


@router.patch(
    "/providers/{provider_id}",
    response_model=AIProviderResponse,
)
def update_existing_provider(
    provider_id: int,
    request: AIProviderUpdateRequest,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> AIProviderResponse:
    """AI Provider 설정 수정."""

    provider = update_provider(
        db,
        provider_id=provider_id,
        request=request,
    )

    if provider is None:
        raise HTTPException(
            status_code=404,
            detail="AI Provider를 찾을 수 없습니다.",
        )

    return provider


# =========================================================
# RAG 문서 관리
# =========================================================


@router.get(
    "/documents",
    response_model=RAGDocumentListResponse,
)
def list_rag_documents(
    skip: int = Query(
        default=0,
        ge=0,
    ),
    limit: int = Query(
        default=100,
        ge=1,
        le=500,
    ),
    provider_id: int | None = Query(
        default=None,
        gt=0,
    ),
    document_type: str | None = Query(
        default=None,
    ),
    document_status: str | None = Query(
        default=None,
    ),
    source_type: str | None = Query(
        default=None,
    ),
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> RAGDocumentListResponse:
    """RAG 문서 목록 조회."""

    total, items = get_rag_document_list(
        db,
        skip=skip,
        limit=limit,
        provider_id=provider_id,
        org_id=auth.org_id,
        document_type=document_type,
        document_status=document_status,
        source_type=source_type,
    )

    return RAGDocumentListResponse(
        total=total,
        items=items,
    )


@router.get(
    "/documents/{document_id}",
    response_model=RAGDocumentResponse,
)
def get_rag_document(
    document_id: int,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> RAGDocumentResponse:
    """RAG 문서 상세 조회."""

    document = get_rag_document_by_id(
        db,
        document_id,
    )

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="RAG 문서를 찾을 수 없습니다.",
        )

    if (
        auth.org_id is not None
        and document.org_id is not None
        and document.org_id != auth.org_id
    ):
        raise HTTPException(
            status_code=403,
            detail="해당 RAG 문서에 접근할 권한이 없습니다.",
        )

    return document


@router.post(
    "/documents",
    response_model=RAGDocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_new_rag_document(
    request: RAGDocumentCreateRequest,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> RAGDocumentResponse:
    """RAG 문서 등록."""

    if (
        auth.org_id is not None
        and request.org_id is not None
        and request.org_id != auth.org_id
    ):
        raise HTTPException(
            status_code=403,
            detail="다른 조직의 RAG 문서를 등록할 수 없습니다.",
        )

    try:
        document = create_rag_document(
            db,
            request,
            default_org_id=auth.org_id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    return document


@router.patch(
    "/documents/{document_id}/status",
    response_model=RAGDocumentResponse,
)
def change_rag_document_status(
    document_id: int,
    request: RAGDocumentStatusUpdateRequest,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> RAGDocumentResponse:
    """RAG 문서 처리 상태 변경."""

    existing = get_rag_document_by_id(
        db,
        document_id,
    )

    if existing is None:
        raise HTTPException(
            status_code=404,
            detail="RAG 문서를 찾을 수 없습니다.",
        )

    if (
        auth.org_id is not None
        and existing.org_id is not None
        and existing.org_id != auth.org_id
    ):
        raise HTTPException(
            status_code=403,
            detail="해당 RAG 문서에 접근할 권한이 없습니다.",
        )

    document = update_rag_document_status(
        db,
        document_id=document_id,
        document_status=request.document_status,
    )

    if document is None:
        raise HTTPException(
            status_code=404,
            detail="RAG 문서를 찾을 수 없습니다.",
        )

    return document


# =========================================================
# AI 질문 / 답변 로그
# =========================================================


@router.get(
    "/query-logs",
    response_model=RAGQueryLogListResponse,
)
def list_query_logs(
    skip: int = Query(
        default=0,
        ge=0,
    ),
    limit: int = Query(
        default=100,
        ge=1,
        le=500,
    ),
    provider_id: int | None = Query(
        default=None,
        gt=0,
    ),
    user_id: int | None = Query(
        default=None,
        gt=0,
    ),
    failed_only: bool = Query(
        default=False,
    ),
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> RAGQueryLogListResponse:
    """AI 질문/답변 로그 목록 조회."""

    total, items = get_query_log_list(
        db,
        skip=skip,
        limit=limit,
        provider_id=provider_id,
        user_id=user_id,
        failed_only=failed_only,
    )

    return RAGQueryLogListResponse(
        total=total,
        items=items,
    )


@router.get(
    "/query-logs/{query_log_id}",
    response_model=RAGQueryLogResponse,
)
def get_query_log(
    query_log_id: int,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> RAGQueryLogResponse:
    """AI 질문/답변 로그 상세 조회."""

    query_log = get_query_log_by_id(
        db,
        query_log_id,
    )

    if query_log is None:
        raise HTTPException(
            status_code=404,
            detail="AI 질문 로그를 찾을 수 없습니다.",
        )

    return query_log


@router.post(
    "/query-logs",
    response_model=RAGQueryLogResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_new_query_log(
    request: RAGQueryLogCreateRequest,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> RAGQueryLogResponse:
    """AI 질문/답변 로그 등록."""

    try:
        query_log = create_query_log(
            db,
            request,
            default_user_id=auth.user_id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    return query_log


# =========================================================
# AI 품질 모니터링
# =========================================================


@router.get(
    "/quality",
    response_model=AIQualityMonitoringResponse,
)
def get_ai_quality(
    provider_id: int | None = Query(
        default=None,
        gt=0,
    ),
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> AIQualityMonitoringResponse:
    """AI 응답 품질 통계 조회."""

    result = get_quality_monitoring(
        db,
        provider_id=provider_id,
    )

    return AIQualityMonitoringResponse(
        **result
    )


# =========================================================
# AI 답변 실패 → 문의 전환
# =========================================================


@router.post(
    "/query-logs/{query_log_id}/convert-to-inquiry",
    response_model=AIQueryToInquiryResponse,
)
def convert_failed_ai_to_inquiry(
    query_log_id: int,
    request: AIQueryToInquiryRequest,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> AIQueryToInquiryResponse:
    """AI 답변 실패 로그를 고객 문의로 전환."""

    try:
        inquiry, created = convert_query_log_to_inquiry(
            db,
            query_log_id=query_log_id,
            request=request,
            org_id=auth.org_id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    message = (
        "AI 답변 실패 로그가 문의로 전환되었습니다."
        if created
        else "이미 해당 AI 로그로 생성된 문의가 존재합니다."
    )

    return AIQueryToInquiryResponse(
        message=message,
        query_log_id=query_log_id,
        inquiry_id=inquiry.inquiry_id,
    )