import json
import re
import time

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.schemas.customer_ai import (
    CustomerAIChatRequest,
    CustomerAIChatResponse,
    CustomerAIInquiryConvertRequest,
    CustomerAIInquiryConvertResponse,
    CustomerAIQueryLogListItemResponse,
    CustomerAIQueryLogListResponse,
    CustomerAIRetrievedChunkResponse,
)
from app.schemas.customer_support import (
    CustomerInquiryCreateRequest,
)
from app.services.customer_support import (
    create_customer_inquiry,
)


MAX_RETRIEVED_CHUNKS = 3


STOP_WORDS = {
    "알려주세요",
    "알려줘",
    "해주세요",
    "해줘",
    "어떻게",
    "되나요",
    "인가요",
    "관련",
    "대한",
    "문의",
    "질문",
    "정보",
}


def _tokenize(
    value: str,
) -> list[str]:
    """
    질문과 RAG 청크를 비교하기 위한
    간단한 검색 토큰 생성.

    실제 임베딩/Qdrant 연결 전까지 사용하는
    로컬 RAG 검색용 처리이다.
    """

    tokens = re.findall(
        r"[0-9]{4}년|[0-9]+|[가-힣]{2,}|[a-zA-Z]{2,}",
        value.lower(),
    )

    return [
        token
        for token in tokens
        if token not in STOP_WORDS
    ]


def _get_customer_rag_chunks(
    db: Session,
):
    """
    고객에게 사용할 수 있는 INDEXED 상태의
    RAG 청크를 조회한다.

    전사 공통 문서 또는 본사 문서만 대상으로 하여
    다른 조직의 내부 RAG 문서가 고객에게 노출되지 않도록 한다.
    """

    return db.execute(
        text(
            """
            SELECT
                c.chunk_id,
                c.document_id,
                c.chunk_no,
                c.chunk_text,

                d.document_name,
                d.document_type,
                d.org_id,
                d.document_status

            FROM rag_chunks AS c

            INNER JOIN rag_documents AS d
                ON d.document_id = c.document_id

            LEFT JOIN org_units AS ou
                ON ou.org_id = d.org_id

            WHERE d.document_status = 'INDEXED'
              AND (
                    d.org_id IS NULL
                    OR ou.org_type = 'HEADQUARTER'
                  )

            ORDER BY
                d.document_id DESC,
                c.chunk_no
            """
        )
    ).mappings().all()


def _score_chunk(
    question: str,
    question_tokens: list[str],
    chunk,
) -> int:
    """
    질문과 RAG 청크의 관련도를 간단히 계산한다.

    현재는 외부 임베딩/Qdrant 연결이 없기 때문에
    키워드 기반 점수를 사용한다.
    """

    score = 0

    chunk_text = (
        chunk["chunk_text"]
        or ""
    ).lower()

    document_name = (
        chunk["document_name"]
        or ""
    ).lower()

    document_type = (
        chunk["document_type"]
        or ""
    ).upper()

    searchable_text = (
        document_name
        + " "
        + chunk_text
    )

    for token in question_tokens:
        if token in searchable_text:
            score += 2

    years = re.findall(
        r"[0-9]{4}년",
        question,
    )

    for year in years:
        if year in searchable_text:
            score += 10

    if "환불" in question:
        if document_type == "REFUND_POLICY":
            score += 5

    if (
        "상품" in question
        or "제품" in question
    ):
        if document_type == "PRODUCT_GUIDE":
            score += 5

    return score


def _retrieve_chunks(
    db: Session,
    question: str,
) -> list[CustomerAIRetrievedChunkResponse]:
    """
    고객 질문과 관련 있는 RAG 청크를 최대 3개 조회한다.

    현재는 키워드 기반 검색을 사용하며,
    향후 Qdrant 연결 시 이 함수 내부를
    벡터 검색으로 교체할 수 있다.
    """

    question_tokens = _tokenize(
        question
    )

    chunks = _get_customer_rag_chunks(
        db=db,
    )

    scored_chunks = []

    for chunk in chunks:
        score = _score_chunk(
            question=question,
            question_tokens=question_tokens,
            chunk=chunk,
        )

        if score <= 0:
            continue

        scored_chunks.append(
            (
                score,
                int(chunk["document_id"]),
                int(chunk["chunk_id"]),
                chunk,
            )
        )

    scored_chunks.sort(
        key=lambda item: (
            item[0],
            item[1],
            item[2],
        ),
        reverse=True,
    )

    selected = scored_chunks[
        :MAX_RETRIEVED_CHUNKS
    ]

    return [
        CustomerAIRetrievedChunkResponse(
            chunk_id=int(
                item[3]["chunk_id"]
            ),
            document_id=int(
                item[3]["document_id"]
            ),
            document_name=(
                item[3]["document_name"]
            ),
            document_type=(
                item[3]["document_type"]
            ),
            chunk_text=(
                item[3]["chunk_text"]
            ),
        )
        for item in selected
    ]


def _build_rag_answer(
    retrieved_chunks: list[
        CustomerAIRetrievedChunkResponse
    ],
) -> str | None:
    """
    검색된 RAG 문서를 기반으로 임시 답변을 생성한다.

    실제 OpenAI / Gemini / Ollama 연결 전까지는
    검색된 문서 원문을 이용해 답변한다.
    """

    if not retrieved_chunks:
        return None

    if len(retrieved_chunks) == 1:
        return retrieved_chunks[0].chunk_text

    lines = [
        "관련 문서를 기준으로 안내드립니다."
    ]

    for chunk in retrieved_chunks:
        lines.append(
            (
                f"- {chunk.document_name}: "
                f"{chunk.chunk_text}"
            )
        )

    return "\n".join(lines)


def _save_query_log(
    db: Session,
    user_id: int,
    question: str,
    answer: str | None,
    retrieved_chunk_ids: list[int],
    response_time_ms: int,
) -> int:
    """
    고객 AI 질문/답변 기록 저장.

    아직 실제 외부 AI Provider를 호출하지 않으므로
    provider_id는 NULL로 저장한다.
    """

    try:
        result = db.execute(
            text(
                """
                INSERT INTO rag_query_logs (
                    user_id,
                    provider_id,
                    question_text,
                    response_text,
                    retrieved_chunk_ids,
                    prompt_tokens,
                    completion_tokens,
                    response_time_ms
                )
                VALUES (
                    :user_id,
                    NULL,
                    :question_text,
                    :response_text,
                    :retrieved_chunk_ids,
                    0,
                    0,
                    :response_time_ms
                )
                """
            ),
            {
                "user_id": user_id,
                "question_text": question,
                "response_text": answer,
                "retrieved_chunk_ids": (
                    json.dumps(
                        retrieved_chunk_ids
                    )
                ),
                "response_time_ms": (
                    response_time_ms
                ),
            },
        )

        query_log_id = result.lastrowid

        db.commit()

    except SQLAlchemyError as exc:
        db.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "AI 질문 기록 저장 중 "
                "데이터베이스 오류가 발생했습니다."
            ),
        ) from exc

    if query_log_id is None:
        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "AI 질문 로그 ID를 "
                "확인할 수 없습니다."
            ),
        )

    return int(query_log_id)


def _parse_chunk_ids(
    value,
) -> list[int]:
    """
    rag_query_logs.retrieved_chunk_ids 값을
    list[int] 형태로 변환한다.
    """

    if value is None:
        return []

    parsed = value

    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return []

    if not isinstance(
        parsed,
        list,
    ):
        return []

    result = []

    for item in parsed:
        try:
            result.append(
                int(item)
            )
        except (
            TypeError,
            ValueError,
        ):
            continue

    return result


def chat_with_customer_ai(
    db: Session,
    user_id: int,
    chat_in: CustomerAIChatRequest,
) -> CustomerAIChatResponse:
    """
    고객 AI 챗봇 질문 처리.

    현재 처리 흐름:

    1. 질문 검증
    2. INDEXED RAG 청크 검색
    3. 관련 문서를 이용한 답변 생성
    4. rag_query_logs 저장

    실제 OpenAI / Gemini / Ollama 및
    Qdrant 연동 전까지는 로컬 RAG 검색 방식으로 동작한다.
    """

    question = chat_in.question.strip()

    if not question:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail="질문을 입력해주세요.",
        )

    started_at = time.perf_counter()

    retrieved_chunks = _retrieve_chunks(
        db=db,
        question=question,
    )

    answer = _build_rag_answer(
        retrieved_chunks=retrieved_chunks,
    )

    response_time_ms = int(
        (
            time.perf_counter()
            - started_at
        )
        * 1000
    )

    retrieved_chunk_ids = [
        chunk.chunk_id
        for chunk in retrieved_chunks
    ]

    query_log_id = _save_query_log(
        db=db,
        user_id=user_id,
        question=question,
        answer=answer,
        retrieved_chunk_ids=(
            retrieved_chunk_ids
        ),
        response_time_ms=response_time_ms,
    )

    created_at = db.execute(
        text(
            """
            SELECT created_at
            FROM rag_query_logs
            WHERE query_log_id = :query_log_id
            """
        ),
        {
            "query_log_id": query_log_id,
        },
    ).scalar_one_or_none()

    return CustomerAIChatResponse(
        query_log_id=query_log_id,
        question=question,
        answer=answer,
        provider_id=None,
        provider_code=None,
        retrieved_chunk_ids=(
            retrieved_chunk_ids
        ),
        retrieved_chunks=(
            retrieved_chunks
        ),
        failed=answer is None,
        created_at=created_at,
    )


def get_customer_ai_query_logs(
    db: Session,
    user_id: int,
    page: int = 1,
    size: int = 20,
) -> CustomerAIQueryLogListResponse:
    """
    로그인한 고객 본인의 AI 질문 기록 조회.
    """

    total = db.execute(
        text(
            """
            SELECT COUNT(*)
            FROM rag_query_logs
            WHERE user_id = :user_id
            """
        ),
        {
            "user_id": user_id,
        },
    ).scalar_one()

    rows = db.execute(
        text(
            """
            SELECT
                query_log_id,
                question_text,
                response_text,
                provider_id,
                retrieved_chunk_ids,
                response_time_ms,
                created_at
            FROM rag_query_logs
            WHERE user_id = :user_id
            ORDER BY
                created_at DESC,
                query_log_id DESC
            LIMIT :limit
            OFFSET :offset
            """
        ),
        {
            "user_id": user_id,
            "limit": size,
            "offset": (
                page - 1
            ) * size,
        },
    ).mappings().all()

    items = [
        CustomerAIQueryLogListItemResponse(
            query_log_id=int(
                row["query_log_id"]
            ),
            question_text=(
                row["question_text"]
            ),
            response_text=(
                row["response_text"]
            ),
            provider_id=(
                int(row["provider_id"])
                if row["provider_id"]
                is not None
                else None
            ),
            retrieved_chunk_ids=(
                _parse_chunk_ids(
                    row[
                        "retrieved_chunk_ids"
                    ]
                )
            ),
            response_time_ms=(
                row["response_time_ms"]
            ),
            failed=(
                row["response_text"]
                is None
                or not str(
                    row["response_text"]
                ).strip()
            ),
            created_at=(
                row["created_at"]
            ),
        )
        for row in rows
    ]

    return CustomerAIQueryLogListResponse(
        items=items,
        total=int(total),
        page=page,
        size=size,
    )


def convert_failed_ai_to_customer_inquiry(
    db: Session,
    user_id: int,
    query_log_id: int,
    convert_in: CustomerAIInquiryConvertRequest,
) -> CustomerAIInquiryConvertResponse:
    """
    고객 본인의 AI 답변 실패 로그를
    기존 고객 문의 시스템으로 전환한다.

    생성되는 문의 상태는
    customer_support 정책에 따라 RECEIVED가 된다.
    """

    query_log = db.execute(
        text(
            """
            SELECT
                query_log_id,
                user_id,
                question_text,
                response_text
            FROM rag_query_logs
            WHERE query_log_id = :query_log_id
              AND user_id = :user_id
            """
        ),
        {
            "query_log_id": query_log_id,
            "user_id": user_id,
        },
    ).mappings().first()

    if query_log is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "AI 질문 기록을 찾을 수 없습니다."
            ),
        )

    response_text = (
        query_log["response_text"]
    )

    if (
        response_text is not None
        and str(
            response_text
        ).strip()
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                "정상 답변이 존재하는 AI 질문은 "
                "실패 문의로 전환할 수 없습니다."
            ),
        )

    marker = (
        f"[AI_QUERY_LOG_ID:{query_log_id}]"
    )

    existing_inquiry = db.execute(
        text(
            """
            SELECT
                inquiry_id,
                inquiry_status
            FROM buyer_inquiries
            WHERE user_id = :user_id
              AND content LIKE :marker
            ORDER BY inquiry_id DESC
            LIMIT 1
            """
        ),
        {
            "user_id": user_id,
            "marker": f"{marker}%",
        },
    ).mappings().first()

    if existing_inquiry is not None:
        return CustomerAIInquiryConvertResponse(
            query_log_id=query_log_id,
            inquiry_id=int(
                existing_inquiry[
                    "inquiry_id"
                ]
            ),
            inquiry_status=(
                existing_inquiry[
                    "inquiry_status"
                ]
            ),
            message=(
                "이미 해당 AI 질문으로 생성된 "
                "문의가 존재합니다."
            ),
        )

    question = (
        query_log["question_text"]
        or "질문 내용 없음"
    )

    title = convert_in.title

    if title is None:
        title = (
            f"AI 답변 실패 문의 "
            f"#{query_log_id}"
        )

    inquiry_content = (
        f"{marker}\n\n"
        f"[AI 질문]\n"
        f"{question}\n\n"
        f"[AI 응답]\n"
        f"AI가 관련 정보를 찾지 못했습니다.\n\n"
        f"AI 답변 실패로 인해 "
        f"고객 문의로 전환되었습니다."
    )

    inquiry_in = (
        CustomerInquiryCreateRequest(
            category_code="ETC",
            title=title,
            content=inquiry_content,
            secret_yn=convert_in.secret_yn,
        )
    )

    inquiry = create_customer_inquiry(
        db=db,
        user_id=user_id,
        inquiry_in=inquiry_in,
    )

    return CustomerAIInquiryConvertResponse(
        query_log_id=query_log_id,
        inquiry_id=inquiry.inquiry_id,
        inquiry_status=(
            inquiry.inquiry_status
        ),
        message=(
            "AI 답변 실패 로그가 "
            "고객 문의로 전환되었습니다."
        ),
    )