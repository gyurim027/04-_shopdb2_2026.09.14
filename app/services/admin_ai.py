from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.ai import (
    AIProvider,
    RAGDocument,
    RAGQueryLog,
)
from app.models.support import BuyerInquiry
from app.schemas.admin_ai import (
    AIProviderCreateRequest,
    AIProviderUpdateRequest,
    AIQueryToInquiryRequest,
    RAGDocumentCreateRequest,
    RAGQueryLogCreateRequest,
)


# =========================================================
# AI Provider 관리
# =========================================================


def get_provider_by_id(
    db: Session,
    provider_id: int,
) -> AIProvider | None:
    """AI Provider 1개 조회."""

    return db.get(
        AIProvider,
        provider_id,
    )


def get_provider_list(
    db: Session,
    *,
    skip: int = 0,
    limit: int = 100,
    provider_type: str | None = None,
    active_yn: str | None = None,
) -> tuple[int, list[AIProvider]]:
    """AI Provider 목록 조회."""

    conditions = []

    if provider_type:
        conditions.append(
            AIProvider.provider_type == provider_type
        )

    if active_yn:
        conditions.append(
            AIProvider.active_yn == active_yn
        )

    count_query = select(
        func.count(AIProvider.provider_id)
    )

    if conditions:
        count_query = count_query.where(*conditions)

    total = db.scalar(count_query) or 0

    query = (
        select(AIProvider)
        .order_by(AIProvider.provider_id.desc())
        .offset(skip)
        .limit(limit)
    )

    if conditions:
        query = query.where(*conditions)

    items = list(
        db.scalars(query).all()
    )

    return total, items


def create_provider(
    db: Session,
    request: AIProviderCreateRequest,
) -> AIProvider:
    """AI Provider 등록."""

    provider = AIProvider(
        provider_code=request.provider_code,
        provider_name=request.provider_name,
        provider_type=request.provider_type,
        base_url=request.base_url,
        chat_model=request.chat_model,
        embedding_model=request.embedding_model,
        active_yn=request.active_yn,
    )

    try:
        db.add(provider)
        db.commit()
        db.refresh(provider)

    except IntegrityError as exc:
        db.rollback()

        raise ValueError(
            "동일한 Provider 코드가 이미 존재합니다."
        ) from exc

    return provider


def update_provider(
    db: Session,
    *,
    provider_id: int,
    request: AIProviderUpdateRequest,
) -> AIProvider | None:
    """AI Provider 설정 수정."""

    provider = db.get(
        AIProvider,
        provider_id,
    )

    if provider is None:
        return None

    update_fields = request.model_fields_set

    if "provider_name" in update_fields:
        provider.provider_name = request.provider_name

    if "provider_type" in update_fields:
        provider.provider_type = request.provider_type

    if "base_url" in update_fields:
        provider.base_url = request.base_url

    if "chat_model" in update_fields:
        provider.chat_model = request.chat_model

    if "embedding_model" in update_fields:
        provider.embedding_model = request.embedding_model

    if "active_yn" in update_fields:
        provider.active_yn = request.active_yn

    db.commit()
    db.refresh(provider)

    return provider


# =========================================================
# RAG 문서 관리
# =========================================================


def get_rag_document_by_id(
    db: Session,
    document_id: int,
) -> RAGDocument | None:
    """RAG 문서 1개 조회."""

    return db.get(
        RAGDocument,
        document_id,
    )


def get_rag_document_list(
    db: Session,
    *,
    skip: int = 0,
    limit: int = 100,
    provider_id: int | None = None,
    org_id: int | None = None,
    document_type: str | None = None,
    document_status: str | None = None,
    source_type: str | None = None,
) -> tuple[int, list[RAGDocument]]:
    """RAG 문서 목록 조회."""

    conditions = []

    if provider_id is not None:
        conditions.append(
            RAGDocument.provider_id == provider_id
        )

    if org_id is not None:
        conditions.append(
            RAGDocument.org_id == org_id
        )

    if document_type:
        conditions.append(
            RAGDocument.document_type == document_type
        )

    if document_status:
        conditions.append(
            RAGDocument.document_status == document_status
        )

    if source_type:
        conditions.append(
            RAGDocument.source_type == source_type
        )

    count_query = select(
        func.count(RAGDocument.document_id)
    )

    if conditions:
        count_query = count_query.where(*conditions)

    total = db.scalar(count_query) or 0

    query = (
        select(RAGDocument)
        .order_by(RAGDocument.document_id.desc())
        .offset(skip)
        .limit(limit)
    )

    if conditions:
        query = query.where(*conditions)

    items = list(
        db.scalars(query).all()
    )

    return total, items


def create_rag_document(
    db: Session,
    request: RAGDocumentCreateRequest,
    *,
    default_org_id: int | None = None,
) -> RAGDocument:
    """RAG 문서 등록."""

    org_id = (
        request.org_id
        if request.org_id is not None
        else default_org_id
    )

    document = RAGDocument(
        provider_id=request.provider_id,
        org_id=org_id,
        document_type=request.document_type,
        document_name=request.document_name,
        source_type=request.source_type,
        source_uri=request.source_uri,
        content_text=request.content_text,
        version=request.version,
        document_status=request.document_status,
    )

    try:
        db.add(document)
        db.commit()
        db.refresh(document)

    except IntegrityError as exc:
        db.rollback()

        raise ValueError(
            "Provider 또는 조직 정보가 올바르지 않습니다."
        ) from exc

    return document


def update_rag_document_status(
    db: Session,
    *,
    document_id: int,
    document_status: str,
) -> RAGDocument | None:
    """RAG 문서 처리 상태 변경."""

    document = db.get(
        RAGDocument,
        document_id,
    )

    if document is None:
        return None

    document.document_status = document_status

    db.commit()
    db.refresh(document)

    return document


# =========================================================
# AI 질문 / 답변 로그
# =========================================================


def get_query_log_by_id(
    db: Session,
    query_log_id: int,
) -> RAGQueryLog | None:
    """AI 질문/답변 로그 1개 조회."""

    return db.get(
        RAGQueryLog,
        query_log_id,
    )


def get_query_log_list(
    db: Session,
    *,
    skip: int = 0,
    limit: int = 100,
    provider_id: int | None = None,
    user_id: int | None = None,
    failed_only: bool = False,
) -> tuple[int, list[RAGQueryLog]]:
    """AI 질문/답변 로그 목록 조회."""

    conditions = []

    if provider_id is not None:
        conditions.append(
            RAGQueryLog.provider_id == provider_id
        )

    if user_id is not None:
        conditions.append(
            RAGQueryLog.user_id == user_id
        )

    if failed_only:
        conditions.append(
            or_(
                RAGQueryLog.response_text.is_(None),
                func.trim(RAGQueryLog.response_text) == "",
            )
        )

    count_query = select(
        func.count(RAGQueryLog.query_log_id)
    )

    if conditions:
        count_query = count_query.where(*conditions)

    total = db.scalar(count_query) or 0

    query = (
        select(RAGQueryLog)
        .order_by(RAGQueryLog.query_log_id.desc())
        .offset(skip)
        .limit(limit)
    )

    if conditions:
        query = query.where(*conditions)

    items = list(
        db.scalars(query).all()
    )

    return total, items


def create_query_log(
    db: Session,
    request: RAGQueryLogCreateRequest,
    *,
    default_user_id: int | None = None,
) -> RAGQueryLog:
    """AI 질문/답변 로그 저장."""

    user_id = (
        request.user_id
        if request.user_id is not None
        else default_user_id
    )

    query_log = RAGQueryLog(
        user_id=user_id,
        provider_id=request.provider_id,
        question_text=request.question_text,
        response_text=request.response_text,
        retrieved_chunk_ids=request.retrieved_chunk_ids,
        prompt_tokens=request.prompt_tokens,
        completion_tokens=request.completion_tokens,
        response_time_ms=request.response_time_ms,
    )

    try:
        db.add(query_log)
        db.commit()
        db.refresh(query_log)

    except IntegrityError as exc:
        db.rollback()

        raise ValueError(
            "사용자 또는 Provider 정보가 올바르지 않습니다."
        ) from exc

    return query_log


# =========================================================
# AI 품질 모니터링
# =========================================================


def get_quality_monitoring(
    db: Session,
    *,
    provider_id: int | None = None,
) -> dict:
    """
    AI 품질 모니터링 통계.

    현재 DB에는 별도의 성공/실패 컬럼이 없기 때문에
    response_text가 NULL 또는 빈 문자열인 로그를
    실패 로그로 판단한다.
    """

    conditions = []

    if provider_id is not None:
        conditions.append(
            RAGQueryLog.provider_id == provider_id
        )

    total_query = select(
        func.count(RAGQueryLog.query_log_id)
    )

    if conditions:
        total_query = total_query.where(*conditions)

    total_logs = db.scalar(total_query) or 0

    failed_conditions = [
        or_(
            RAGQueryLog.response_text.is_(None),
            func.trim(RAGQueryLog.response_text) == "",
        )
    ]

    if provider_id is not None:
        failed_conditions.append(
            RAGQueryLog.provider_id == provider_id
        )

    failed_query = (
        select(
            func.count(RAGQueryLog.query_log_id)
        )
        .where(*failed_conditions)
    )

    failed_logs = db.scalar(failed_query) or 0

    average_query = select(
        func.avg(RAGQueryLog.response_time_ms),
        func.avg(RAGQueryLog.prompt_tokens),
        func.avg(RAGQueryLog.completion_tokens),
        func.avg(
            func.coalesce(
                RAGQueryLog.prompt_tokens,
                0,
            )
            + func.coalesce(
                RAGQueryLog.completion_tokens,
                0,
            )
        ),
    )

    if conditions:
        average_query = average_query.where(*conditions)

    averages = db.execute(
        average_query
    ).one()

    average_response_time_ms = float(
        averages[0] or 0
    )

    average_prompt_tokens = float(
        averages[1] or 0
    )

    average_completion_tokens = float(
        averages[2] or 0
    )

    average_total_tokens = float(
        averages[3] or 0
    )

    failure_rate = (
        round(
            (failed_logs / total_logs) * 100,
            2,
        )
        if total_logs > 0
        else 0.0
    )

    return {
        "total_logs": total_logs,
        "failed_logs": failed_logs,
        "failure_rate": failure_rate,
        "average_response_time_ms": round(
            average_response_time_ms,
            2,
        ),
        "average_prompt_tokens": round(
            average_prompt_tokens,
            2,
        ),
        "average_completion_tokens": round(
            average_completion_tokens,
            2,
        ),
        "average_total_tokens": round(
            average_total_tokens,
            2,
        ),
    }


# =========================================================
# AI 답변 실패 → 고객 문의 전환
# =========================================================


def is_failed_query_log(
    query_log: RAGQueryLog,
) -> bool:
    """현재 DB 구조에서 AI 답변 실패 여부를 판별."""

    if query_log.response_text is None:
        return True

    return not query_log.response_text.strip()


def convert_query_log_to_inquiry(
    db: Session,
    *,
    query_log_id: int,
    request: AIQueryToInquiryRequest,
    org_id: int | None = None,
) -> tuple[BuyerInquiry, bool]:
    """
    AI 답변 실패 로그를 buyer_inquiries 문의로 전환.

    반환값:
    (문의 객체, 새로 생성되었는지 여부)
    """

    query_log = db.get(
        RAGQueryLog,
        query_log_id,
    )

    if query_log is None:
        raise ValueError(
            "AI 질문 로그를 찾을 수 없습니다."
        )

    if not is_failed_query_log(query_log):
        raise ValueError(
            "정상 응답이 존재하는 로그는 실패 문의로 전환할 수 없습니다."
        )

    user_id = (
        query_log.user_id
        if query_log.user_id is not None
        else request.user_id
    )

    if user_id is None:
        raise ValueError(
            "문의로 전환하려면 사용자 ID가 필요합니다."
        )

    marker = (
        f"[AI_QUERY_LOG_ID:{query_log.query_log_id}]"
    )

    existing_query = (
        select(BuyerInquiry)
        .where(
            BuyerInquiry.user_id == user_id,
            BuyerInquiry.content.like(
                f"{marker}%"
            ),
        )
        .order_by(
            BuyerInquiry.inquiry_id.desc()
        )
    )

    existing = db.scalar(
        existing_query
    )

    if existing is not None:
        return existing, False

    question = (
        query_log.question_text
        or "질문 내용 없음"
    )

    response = (
        query_log.response_text
        or "AI 응답 없음"
    )

    title = request.title

    if title is None:
        title = (
            f"AI 답변 실패 문의 "
            f"#{query_log.query_log_id}"
        )

    content = (
        f"{marker}\n\n"
        f"[AI 질문]\n"
        f"{question}\n\n"
        f"[AI 응답]\n"
        f"{response}\n\n"
        f"AI 답변 실패로 인해 "
        f"관리자 문의로 전환되었습니다."
    )

    inquiry = BuyerInquiry(
        user_id=user_id,
        org_id=org_id,
        category_code=request.category_code,
        title=title,
        content=content,
        inquiry_status="OPEN",
        secret_yn=request.secret_yn,
    )

    try:
        db.add(inquiry)
        db.commit()
        db.refresh(inquiry)

    except IntegrityError as exc:
        db.rollback()

        raise ValueError(
            "문의 생성에 필요한 사용자 또는 조직 정보가 올바르지 않습니다."
        ) from exc

    return inquiry, True