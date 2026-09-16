import hashlib
import uuid
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import AuthContext, require_customer
from app.schemas.admin_files import FileDomainLinkRequest
from app.schemas.customer_support import (
    CustomerInquiryCreateRequest,
    CustomerInquiryFileUploadResponse,
    CustomerInquiryListResponse,
    CustomerInquiryResponse,
    CustomerInquiryStatusResponse,
    CustomerPolicyListItemResponse,
    CustomerPolicyResponse,
)
from app.services import customer_support as service
from app.services.admin_files import (
    create_file_asset,
    deactivate_file,
    link_file_to_domain,
)


router = APIRouter(
    prefix="/customer/support",
    tags=["Customer Support"],
)


UPLOAD_DIR = Path("uploads/files")

MAX_INQUIRY_FILE_SIZE = 10 * 1024 * 1024


def detect_file_type(
    mime_type: str | None,
    extension: str,
) -> str:
    """
    업로드된 문의 첨부파일 종류 판별.
    """

    mime = (mime_type or "").lower()
    ext = extension.lower()

    if mime.startswith("image/"):
        return "IMAGE"

    if mime == "application/pdf" or ext == "pdf":
        return "PDF"

    if mime.startswith("video/"):
        return "VIDEO"

    if mime.startswith("audio/"):
        return "AUDIO"

    document_extensions = {
        "txt",
        "doc",
        "docx",
        "xls",
        "xlsx",
        "ppt",
        "pptx",
        "csv",
        "hwp",
    }

    if ext in document_extensions:
        return "DOCUMENT"

    return "ETC"


# =========================================================
# 고객 문의
# =========================================================


@router.post(
    "/inquiries",
    response_model=CustomerInquiryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_inquiry(
    inquiry_in: CustomerInquiryCreateRequest,
    auth: AuthContext = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CustomerInquiryResponse:
    """
    고객 문의 작성.

    신규 문의는 RECEIVED 상태로 생성된다.
    """

    return service.create_customer_inquiry(
        db=db,
        user_id=auth.user_id,
        inquiry_in=inquiry_in,
    )


@router.get(
    "/inquiries",
    response_model=CustomerInquiryListResponse,
)
def get_inquiries(
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
    inquiry_status: str | None = Query(
        default=None,
        description="문의 상태 필터",
    ),
    category_code: str | None = Query(
        default=None,
        description="문의 카테고리 필터",
    ),
    auth: AuthContext = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CustomerInquiryListResponse:
    """
    로그인한 고객 본인의 문의 목록 조회.
    """

    return service.get_customer_inquiries(
        db=db,
        user_id=auth.user_id,
        page=page,
        size=size,
        inquiry_status=inquiry_status,
        category_code=category_code,
    )


@router.post(
    "/inquiries/{inquiry_id}/files",
    response_model=CustomerInquiryFileUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_inquiry_file(
    inquiry_id: int,
    file: UploadFile = File(...),
    auth: AuthContext = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CustomerInquiryFileUploadResponse:
    """
    고객 자신의 문의에 첨부파일을 업로드한다.

    파일 정보:
    file_assets

    문의와 파일 연결:
    inquiry_files
    """

    inquiry = service.assert_customer_inquiry_owner(
        db=db,
        user_id=auth.user_id,
        inquiry_id=inquiry_id,
    )

    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="파일 이름이 없습니다.",
        )

    original_name = Path(file.filename).name

    extension = (
        Path(original_name)
        .suffix
        .lower()
        .lstrip(".")
    )

    if len(extension) > 30:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="파일 확장자가 너무 깁니다.",
        )

    content = await file.read()

    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="빈 파일은 업로드할 수 없습니다.",
        )

    if len(content) > MAX_INQUIRY_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="첨부파일은 최대 10MB까지 업로드할 수 있습니다.",
        )

    stored_name = (
        f"{uuid.uuid4().hex}"
        + (f".{extension}" if extension else "")
    )

    UPLOAD_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    file_path = UPLOAD_DIR / stored_name

    try:
        file_path.write_bytes(content)

    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="파일 저장 중 오류가 발생했습니다.",
        ) from exc

    checksum = hashlib.sha256(content).hexdigest()

    file_type = detect_file_type(
        mime_type=file.content_type,
        extension=extension,
    )

    file_asset = None

    try:
        file_asset = create_file_asset(
            db,
            org_id=inquiry["org_id"],
            file_type=file_type,
            storage_type="LOCAL",
            original_file_name=original_name,
            stored_file_name=stored_name,
            file_extension=extension or None,
            mime_type=file.content_type,
            file_size=len(content),
            storage_path=str(file_path).replace("\\", "/"),
            checksum_sha256=checksum,
        )

        link_request = FileDomainLinkRequest(
            domain_type="INQUIRY",
            domain_id=inquiry_id,
        )

        link_file_to_domain(
            db,
            file_id=file_asset.file_id,
            request=link_request,
        )

    except (ValueError, IntegrityError) as exc:
        db.rollback()

        if file_asset is not None:
            try:
                deactivate_file(
                    db,
                    file_asset.file_id,
                )
            except Exception:
                db.rollback()

        if file_path.exists():
            file_path.unlink()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="문의 첨부파일 연결에 실패했습니다.",
        ) from exc

    except Exception:
        db.rollback()

        if file_asset is not None:
            try:
                deactivate_file(
                    db,
                    file_asset.file_id,
                )
            except Exception:
                db.rollback()

        if file_path.exists():
            file_path.unlink()

        raise

    inquiry_detail = service.get_customer_inquiry_detail(
        db=db,
        user_id=auth.user_id,
        inquiry_id=inquiry_id,
    )

    uploaded_file = next(
        (
            item
            for item in inquiry_detail.files
            if item.file_id == file_asset.file_id
        ),
        None,
    )

    if uploaded_file is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="업로드된 문의 파일 정보를 확인할 수 없습니다.",
        )

    return CustomerInquiryFileUploadResponse(
        message="문의 첨부파일이 등록되었습니다.",
        inquiry_id=inquiry_id,
        file=uploaded_file,
    )


@router.get(
    "/inquiries/{inquiry_id}/status",
    response_model=CustomerInquiryStatusResponse,
)
def get_inquiry_status(
    inquiry_id: int,
    auth: AuthContext = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CustomerInquiryStatusResponse:
    """
    고객 문의의 현재 답변 상태 조회.
    """

    return service.get_customer_inquiry_status(
        db=db,
        user_id=auth.user_id,
        inquiry_id=inquiry_id,
    )


@router.get(
    "/inquiries/{inquiry_id}",
    response_model=CustomerInquiryResponse,
)
def get_inquiry_detail(
    inquiry_id: int,
    auth: AuthContext = Depends(require_customer),
    db: Session = Depends(get_db),
) -> CustomerInquiryResponse:
    """
    로그인한 고객 본인의 문의 상세 조회.

    관리자가 답변한 경우 답변 내용과
    문의 첨부파일도 함께 반환한다.
    """

    return service.get_customer_inquiry_detail(
        db=db,
        user_id=auth.user_id,
        inquiry_id=inquiry_id,
    )


# =========================================================
# 회사 정책
# =========================================================


@router.get(
    "/policies",
    response_model=list[CustomerPolicyListItemResponse],
)
def get_policies(
    db: Session = Depends(get_db),
) -> list[CustomerPolicyListItemResponse]:
    """
    현재 적용 중인 회사 정책 목록 조회.

    로그인하지 않은 사용자도 조회 가능하다.
    """

    return service.get_customer_policies(
        db=db,
    )


@router.get(
    "/policies/{policy_id}",
    response_model=CustomerPolicyResponse,
)
def get_policy_detail(
    policy_id: int,
    db: Session = Depends(get_db),
) -> CustomerPolicyResponse:
    """
    현재 적용 중인 회사 정책 상세 조회.
    """

    return service.get_customer_policy_detail(
        db=db,
        policy_id=policy_id,
    )