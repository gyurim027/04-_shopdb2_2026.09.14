from fastapi import (
    APIRouter,
    Depends,
    Query,
    status,
)
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import (
    AuthContext,
    require_customer,
)
from app.schemas.customer_ai import (
    CustomerAIChatRequest,
    CustomerAIChatResponse,
    CustomerAIInquiryConvertRequest,
    CustomerAIInquiryConvertResponse,
    CustomerAIQueryLogListResponse,
)
from app.services import customer_ai as service


router = APIRouter(
    prefix="/customer/ai",
    tags=["Customer AI"],
)


# =========================================================
# 고객 AI 챗봇
# =========================================================


@router.post(
    "/chat",
    response_model=CustomerAIChatResponse,
    status_code=status.HTTP_200_OK,
)
def chat(
    chat_in: CustomerAIChatRequest,
    auth: AuthContext = Depends(
        require_customer
    ),
    db: Session = Depends(get_db),
) -> CustomerAIChatResponse:
    """
    로그인한 고객이 AI 챗봇에게 질문한다.

    현재는 기존 RAG 문서를 검색하여
    관련 문서를 기반으로 답변한다.

    실제 OpenAI / Gemini / Ollama 및
    Qdrant 연동 전까지는 로컬 RAG 검색 방식으로 동작한다.
    """

    return service.chat_with_customer_ai(
        db=db,
        user_id=auth.user_id,
        chat_in=chat_in,
    )


# =========================================================
# 고객 AI 질문 기록
# =========================================================


@router.get(
    "/query-logs",
    response_model=CustomerAIQueryLogListResponse,
)
def get_query_logs(
    page: int = Query(
        default=1,
        ge=1,
        description="페이지 번호",
    ),
    size: int = Query(
        default=20,
        ge=1,
        le=100,
        description="페이지당 조회 개수",
    ),
    auth: AuthContext = Depends(
        require_customer
    ),
    db: Session = Depends(get_db),
) -> CustomerAIQueryLogListResponse:
    """
    로그인한 고객 본인의
    AI 질문/답변 기록을 조회한다.
    """

    return service.get_customer_ai_query_logs(
        db=db,
        user_id=auth.user_id,
        page=page,
        size=size,
    )


# =========================================================
# AI 답변 실패 → 고객 문의 전환
# =========================================================


@router.post(
    "/query-logs/{query_log_id}/convert-to-inquiry",
    response_model=CustomerAIInquiryConvertResponse,
    status_code=status.HTTP_201_CREATED,
)
def convert_failed_query_to_inquiry(
    query_log_id: int,
    convert_in: CustomerAIInquiryConvertRequest,
    auth: AuthContext = Depends(
        require_customer
    ),
    db: Session = Depends(get_db),
) -> CustomerAIInquiryConvertResponse:
    """
    로그인한 고객 본인의 AI 답변 실패 기록을
    기존 고객 문의 시스템으로 전환한다.

    생성된 문의는 Customer Support 정책에 따라
    RECEIVED 상태로 저장된다.
    """

    return (
        service.convert_failed_ai_to_customer_inquiry(
            db=db,
            user_id=auth.user_id,
            query_log_id=query_log_id,
            convert_in=convert_in,
        )
    )