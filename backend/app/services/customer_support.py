from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.schemas.customer_support import (
    CustomerInquiryCreateRequest,
    CustomerInquiryFileResponse,
    CustomerInquiryListItemResponse,
    CustomerInquiryListResponse,
    CustomerInquiryResponse,
    CustomerInquiryStatusResponse,
    CustomerPolicyListItemResponse,
    CustomerPolicyResponse,
)


ALLOWED_INQUIRY_CATEGORIES = {
    "PRODUCT",
    "DELIVERY",
    "PAYMENT",
    "REFUND",
    "ETC",
}


def _get_headquarters_org_id(
    db: Session,
) -> int | None:
    """
    고객 문의를 담당할 본사 조직 ID를 조회한다.

    본사 조직이 존재하지 않으면 NULL로 저장한다.
    """

    org_id = db.execute(
        text(
            """
            SELECT org_id
            FROM org_units
            WHERE org_type = 'HEADQUARTER'
            ORDER BY org_id
            LIMIT 1
            """
        )
    ).scalar()

    return int(org_id) if org_id is not None else None


def _get_owned_inquiry(
    db: Session,
    user_id: int,
    inquiry_id: int,
):
    """
    로그인한 고객 본인의 문의만 조회한다.
    """

    inquiry = db.execute(
        text(
            """
            SELECT
                inquiry_id,
                user_id,
                org_id,
                category_code,
                title,
                content,
                inquiry_status,
                secret_yn,
                answer_content,
                answered_by_user_id,
                created_at,
                updated_at,
                answered_at
            FROM buyer_inquiries
            WHERE inquiry_id = :inquiry_id
              AND user_id = :user_id
            """
        ),
        {
            "inquiry_id": inquiry_id,
            "user_id": user_id,
        },
    ).mappings().first()

    if inquiry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="문의를 찾을 수 없습니다.",
        )

    return inquiry


def assert_customer_inquiry_owner(
    db: Session,
    user_id: int,
    inquiry_id: int,
):
    """
    첨부파일 업로드 등에서 사용할
    문의 소유권 확인 함수.
    """

    return _get_owned_inquiry(
        db=db,
        user_id=user_id,
        inquiry_id=inquiry_id,
    )


def _get_inquiry_files(
    db: Session,
    inquiry_id: int,
) -> list[CustomerInquiryFileResponse]:
    """
    문의에 연결된 활성 첨부파일 목록 조회.
    """

    rows = db.execute(
        text(
            """
            SELECT
                inf.inquiry_file_id,
                inf.file_id,
                fa.file_type,
                fa.original_file_name,
                fa.file_extension,
                fa.mime_type,
                fa.file_size,
                fa.public_url,
                fa.thumbnail_url,
                inf.created_at
            FROM inquiry_files AS inf
            INNER JOIN file_assets AS fa
                ON fa.file_id = inf.file_id
            WHERE inf.inquiry_id = :inquiry_id
              AND COALESCE(fa.active_yn, 'Y') = 'Y'
            ORDER BY inf.inquiry_file_id
            """
        ),
        {
            "inquiry_id": inquiry_id,
        },
    ).mappings().all()

    return [
        CustomerInquiryFileResponse(
            inquiry_file_id=row["inquiry_file_id"],
            file_id=row["file_id"],
            file_type=row["file_type"],
            original_file_name=row["original_file_name"],
            file_extension=row["file_extension"],
            mime_type=row["mime_type"],
            file_size=row["file_size"],
            public_url=row["public_url"],
            thumbnail_url=row["thumbnail_url"],
            created_at=row["created_at"],
        )
        for row in rows
    ]


def create_customer_inquiry(
    db: Session,
    user_id: int,
    inquiry_in: CustomerInquiryCreateRequest,
) -> CustomerInquiryResponse:
    """
    고객 문의를 생성한다.

    신규 문의 상태:
    RECEIVED

    고객은 user_id, org_id, 상태,
    답변 내용을 직접 지정할 수 없다.
    """

    category_code = (
        inquiry_in.category_code
        .strip()
        .upper()
    )

    if category_code not in ALLOWED_INQUIRY_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "지원하지 않는 문의 카테고리입니다. "
                "PRODUCT, DELIVERY, PAYMENT, REFUND, ETC 중 "
                "하나를 사용해주세요."
            ),
        )

    title = inquiry_in.title.strip()
    content = inquiry_in.content.strip()

    if not title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="문의 제목을 입력해주세요.",
        )

    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="문의 내용을 입력해주세요.",
        )

    org_id = _get_headquarters_org_id(db)

    try:
        result = db.execute(
            text(
                """
                INSERT INTO buyer_inquiries (
                    user_id,
                    org_id,
                    category_code,
                    title,
                    content,
                    inquiry_status,
                    secret_yn,
                    answer_content,
                    answered_by_user_id,
                    answered_at
                )
                VALUES (
                    :user_id,
                    :org_id,
                    :category_code,
                    :title,
                    :content,
                    'RECEIVED',
                    :secret_yn,
                    NULL,
                    NULL,
                    NULL
                )
                """
            ),
            {
                "user_id": user_id,
                "org_id": org_id,
                "category_code": category_code,
                "title": title,
                "content": content,
                "secret_yn": inquiry_in.secret_yn,
            },
        )

        inquiry_id = result.lastrowid

        db.commit()

    except SQLAlchemyError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="문의 저장 중 데이터베이스 오류가 발생했습니다.",
        ) from exc

    if inquiry_id is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="문의 ID를 확인할 수 없습니다.",
        )

    return get_customer_inquiry_detail(
        db=db,
        user_id=user_id,
        inquiry_id=int(inquiry_id),
    )


def get_customer_inquiry_detail(
    db: Session,
    user_id: int,
    inquiry_id: int,
) -> CustomerInquiryResponse:
    """
    로그인한 고객 본인의 문의 상세 조회.

    관리자 답변이 등록된 경우
    답변 내용도 함께 반환한다.
    """

    inquiry = _get_owned_inquiry(
        db=db,
        user_id=user_id,
        inquiry_id=inquiry_id,
    )

    files = _get_inquiry_files(
        db=db,
        inquiry_id=inquiry_id,
    )

    return CustomerInquiryResponse(
        inquiry_id=inquiry["inquiry_id"],
        user_id=inquiry["user_id"],
        org_id=inquiry["org_id"],
        category_code=inquiry["category_code"],
        title=inquiry["title"],
        content=inquiry["content"],
        inquiry_status=inquiry["inquiry_status"],
        secret_yn=inquiry["secret_yn"],
        answer_content=inquiry["answer_content"],
        answered_by_user_id=inquiry["answered_by_user_id"],
        created_at=inquiry["created_at"],
        updated_at=inquiry["updated_at"],
        answered_at=inquiry["answered_at"],
        files=files,
    )


def get_customer_inquiries(
    db: Session,
    user_id: int,
    page: int = 1,
    size: int = 20,
    inquiry_status: str | None = None,
    category_code: str | None = None,
) -> CustomerInquiryListResponse:
    """
    로그인한 고객 본인의 문의 목록 조회.
    """

    conditions = [
        "user_id = :user_id",
    ]

    params: dict = {
        "user_id": user_id,
    }

    if inquiry_status:
        conditions.append(
            "inquiry_status = :inquiry_status"
        )
        params["inquiry_status"] = (
            inquiry_status.strip().upper()
        )

    if category_code:
        category = category_code.strip().upper()

        if category not in ALLOWED_INQUIRY_CATEGORIES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="지원하지 않는 문의 카테고리입니다.",
            )

        conditions.append(
            "category_code = :category_code"
        )
        params["category_code"] = category

    where_clause = " AND ".join(conditions)

    total = db.execute(
        text(
            f"""
            SELECT COUNT(*)
            FROM buyer_inquiries
            WHERE {where_clause}
            """
        ),
        params,
    ).scalar_one()

    list_params = {
        **params,
        "limit": size,
        "offset": (page - 1) * size,
    }

    rows = db.execute(
        text(
            f"""
            SELECT
                inquiry_id,
                category_code,
                title,
                inquiry_status,
                secret_yn,
                answer_content,
                created_at,
                updated_at,
                answered_at
            FROM buyer_inquiries
            WHERE {where_clause}
            ORDER BY
                created_at DESC,
                inquiry_id DESC
            LIMIT :limit
            OFFSET :offset
            """
        ),
        list_params,
    ).mappings().all()

    items = [
        CustomerInquiryListItemResponse(
            inquiry_id=row["inquiry_id"],
            category_code=row["category_code"],
            title=row["title"],
            inquiry_status=row["inquiry_status"],
            secret_yn=row["secret_yn"],
            has_answer=(
                row["answer_content"] is not None
                or row["answered_at"] is not None
            ),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            answered_at=row["answered_at"],
        )
        for row in rows
    ]

    return CustomerInquiryListResponse(
        items=items,
        total=int(total),
        page=page,
        size=size,
    )


def get_customer_inquiry_status(
    db: Session,
    user_id: int,
    inquiry_id: int,
) -> CustomerInquiryStatusResponse:
    """
    고객 문의의 답변 상태 조회.
    """

    inquiry = _get_owned_inquiry(
        db=db,
        user_id=user_id,
        inquiry_id=inquiry_id,
    )

    return CustomerInquiryStatusResponse(
        inquiry_id=inquiry["inquiry_id"],
        inquiry_status=inquiry["inquiry_status"],
        answer_content=inquiry["answer_content"],
        created_at=inquiry["created_at"],
        answered_at=inquiry["answered_at"],
    )


def get_customer_policies(
    db: Session,
) -> list[CustomerPolicyListItemResponse]:
    """
    현재 고객에게 공개할 수 있는 회사 정책 목록 조회.

    현재 유효하고 활성화된 정책 중
    전사 공통(org_id NULL) 또는 본사 정책을 대상으로 한다.

    같은 policy_code에 여러 버전이 있다면
    현재 적용 가능한 가장 최신 버전만 반환한다.
    """

    rows = db.execute(
        text(
            """
            WITH ranked_policies AS (
                SELECT
                    cp.policy_id,
                    cp.org_id,
                    cp.policy_code,
                    cp.policy_name,
                    cp.policy_version,
                    cp.policy_type,
                    cp.effective_from,
                    cp.effective_to,
                    ROW_NUMBER() OVER (
                        PARTITION BY cp.policy_code
                        ORDER BY
                            cp.effective_from DESC,
                            cp.policy_id DESC
                    ) AS row_num
                FROM company_policies AS cp
                LEFT JOIN org_units AS ou
                    ON ou.org_id = cp.org_id
                WHERE COALESCE(cp.active_yn, 'Y') = 'Y'
                  AND cp.effective_from <= CURRENT_DATE
                  AND (
                        cp.effective_to IS NULL
                        OR cp.effective_to >= CURRENT_DATE
                      )
                  AND (
                        cp.org_id IS NULL
                        OR ou.org_type = 'HEADQUARTER'
                      )
            )
            SELECT
                policy_id,
                policy_code,
                policy_name,
                policy_version,
                policy_type,
                effective_from,
                effective_to
            FROM ranked_policies
            WHERE row_num = 1
            ORDER BY
                policy_code,
                policy_id DESC
            """
        )
    ).mappings().all()

    return [
        CustomerPolicyListItemResponse(
            policy_id=row["policy_id"],
            policy_code=row["policy_code"],
            policy_name=row["policy_name"],
            policy_version=row["policy_version"],
            policy_type=row["policy_type"],
            effective_from=row["effective_from"],
            effective_to=row["effective_to"],
        )
        for row in rows
    ]


def get_customer_policy_detail(
    db: Session,
    policy_id: int,
) -> CustomerPolicyResponse:
    """
    고객에게 공개 가능한 회사 정책 상세 조회.
    """

    row = db.execute(
        text(
            """
            SELECT
                cp.policy_id,
                cp.org_id,
                cp.policy_code,
                cp.policy_name,
                cp.policy_version,
                cp.policy_type,
                cp.policy_content,
                cp.effective_from,
                cp.effective_to,
                cp.active_yn
            FROM company_policies AS cp
            LEFT JOIN org_units AS ou
                ON ou.org_id = cp.org_id
            WHERE cp.policy_id = :policy_id
              AND COALESCE(cp.active_yn, 'Y') = 'Y'
              AND cp.effective_from <= CURRENT_DATE
              AND (
                    cp.effective_to IS NULL
                    OR cp.effective_to >= CURRENT_DATE
                  )
              AND (
                    cp.org_id IS NULL
                    OR ou.org_type = 'HEADQUARTER'
                  )
            """
        ),
        {
            "policy_id": policy_id,
        },
    ).mappings().first()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="회사 정책을 찾을 수 없습니다.",
        )

    return CustomerPolicyResponse(
        policy_id=row["policy_id"],
        org_id=row["org_id"],
        policy_code=row["policy_code"],
        policy_name=row["policy_name"],
        policy_version=row["policy_version"],
        policy_type=row["policy_type"],
        policy_content=row["policy_content"],
        effective_from=row["effective_from"],
        effective_to=row["effective_to"],
        active_yn=row["active_yn"],
    )