import hashlib
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import AuthContext, require_admin
from app.schemas.admin_files import (
    FileDeleteResponse,
    FileDomainLinkRequest,
    FileDomainLinkResponse,
    FileListResponse,
    FileUploadResponse,
)
from app.services.admin_files import (
    create_file_asset,
    deactivate_file,
    get_file_list,
    link_file_to_domain,
)


router = APIRouter(
    prefix="/admin/files",
    tags=["Admin Files"],
)


UPLOAD_DIR = Path("uploads/files")


def detect_file_type(
    mime_type: str | None,
    extension: str,
) -> str:
    """업로드된 파일의 종류를 판별."""

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


@router.get(
    "",
    response_model=FileListResponse,
)
def list_files(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    file_type: str | None = Query(default=None),
    active_yn: str | None = Query(default=None),
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> FileListResponse:
    """관리자 파일 목록 조회."""

    total, items = get_file_list(
        db,
        skip=skip,
        limit=limit,
        file_type=file_type,
        active_yn=active_yn,
    )

    return FileListResponse(
        total=total,
        items=items,
    )


@router.post(
    "/upload",
    response_model=FileUploadResponse,
    status_code=201,
)
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> FileUploadResponse:
    """파일을 서버에 저장하고 file_assets에 등록."""

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="파일 이름이 없습니다.",
        )

    original_name = Path(file.filename).name
    extension = Path(original_name).suffix.lower().lstrip(".")

    stored_name = (
        f"{uuid.uuid4().hex}"
        + (f".{extension}" if extension else "")
    )

    UPLOAD_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    file_path = UPLOAD_DIR / stored_name

    content = await file.read()

    if len(content) == 0:
        raise HTTPException(
            status_code=400,
            detail="빈 파일은 업로드할 수 없습니다.",
        )

    checksum = hashlib.sha256(content).hexdigest()

    try:
        file_path.write_bytes(content)
    except OSError as exc:
        raise HTTPException(
            status_code=500,
            detail="파일 저장 중 오류가 발생했습니다.",
        ) from exc

    file_type = detect_file_type(
        file.content_type,
        extension,
    )

    try:
        file_asset = create_file_asset(
            db,
            org_id=auth.org_id,
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

    except Exception:
        if file_path.exists():
            file_path.unlink()

        db.rollback()
        raise

    return FileUploadResponse(
        file=file_asset,
    )


@router.delete(
    "/{file_id}",
    response_model=FileDeleteResponse,
)
def delete_file(
    file_id: int,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> FileDeleteResponse:
    """파일을 실제 삭제하지 않고 비활성화."""

    file_asset = deactivate_file(
        db,
        file_id,
    )

    if file_asset is None:
        raise HTTPException(
            status_code=404,
            detail="파일을 찾을 수 없습니다.",
        )

    return FileDeleteResponse(
        message="파일이 비활성화되었습니다.",
        file_id=file_asset.file_id,
        active_yn=file_asset.active_yn or "N",
    )


@router.post(
    "/{file_id}/links",
    response_model=FileDomainLinkResponse,
    status_code=201,
)
def create_file_link(
    file_id: int,
    request: FileDomainLinkRequest,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_admin),
) -> FileDomainLinkResponse:
    """파일을 상품, 문의, 정책, RAG 문서 등과 연결."""

    try:
        link_file_to_domain(
            db,
            file_id=file_id,
            request=request,
        )

    except ValueError as exc:
        db.rollback()

        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc

    except IntegrityError as exc:
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail="연결 대상이 존재하지 않거나 DB 제약조건에 맞지 않습니다.",
        ) from exc

    return FileDomainLinkResponse(
        message="파일 연결이 완료되었습니다.",
        file_id=file_id,
        domain_type=request.domain_type,
        domain_id=request.domain_id,
    )