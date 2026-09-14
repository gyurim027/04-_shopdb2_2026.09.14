from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.models.files import FileAsset
from app.schemas.admin_files import FileDomainLinkRequest


def get_file_by_id(
    db: Session,
    file_id: int,
) -> FileAsset | None:
    """파일 1개 조회."""

    return db.get(FileAsset, file_id)


def get_file_list(
    db: Session,
    *,
    skip: int = 0,
    limit: int = 100,
    file_type: str | None = None,
    active_yn: str | None = None,
) -> tuple[int, list[FileAsset]]:
    """파일 목록 조회."""

    conditions = []

    if file_type:
        conditions.append(FileAsset.file_type == file_type)

    if active_yn:
        conditions.append(FileAsset.active_yn == active_yn)

    count_query = select(func.count(FileAsset.file_id))

    if conditions:
        count_query = count_query.where(*conditions)

    total = db.scalar(count_query) or 0

    query = (
        select(FileAsset)
        .order_by(FileAsset.file_id.desc())
        .offset(skip)
        .limit(limit)
    )

    if conditions:
        query = query.where(*conditions)

    items = list(db.scalars(query).all())

    return total, items


def create_file_asset(
    db: Session,
    *,
    org_id: int | None,
    file_type: str,
    storage_type: str,
    original_file_name: str | None,
    stored_file_name: str | None,
    file_extension: str | None,
    mime_type: str | None,
    file_size: int,
    storage_path: str | None,
    public_url: str | None = None,
    thumbnail_url: str | None = None,
    checksum_sha256: str | None = None,
) -> FileAsset:
    """file_assets에 파일 정보를 등록."""

    file_asset = FileAsset(
        org_id=org_id,
        file_type=file_type,
        storage_type=storage_type,
        original_file_name=original_file_name,
        stored_file_name=stored_file_name,
        file_extension=file_extension,
        mime_type=mime_type,
        file_size=file_size,
        storage_path=storage_path,
        public_url=public_url,
        thumbnail_url=thumbnail_url,
        checksum_sha256=checksum_sha256,
        active_yn="Y",
    )

    db.add(file_asset)
    db.commit()
    db.refresh(file_asset)

    return file_asset


def deactivate_file(
    db: Session,
    file_id: int,
) -> FileAsset | None:
    """파일을 실제 삭제하지 않고 비활성화."""

    file_asset = db.get(FileAsset, file_id)

    if file_asset is None:
        return None

    file_asset.active_yn = "N"

    db.commit()
    db.refresh(file_asset)

    return file_asset


def link_file_to_domain(
    db: Session,
    *,
    file_id: int,
    request: FileDomainLinkRequest,
) -> None:
    """파일을 상품/문의/정책/RAG 문서와 연결."""

    file_asset = db.get(FileAsset, file_id)

    if file_asset is None:
        raise ValueError("파일을 찾을 수 없습니다.")

    domain_type = request.domain_type

    if domain_type == "PRODUCT":
        query = text(
            """
            INSERT INTO product_files
                (
                    product_id,
                    file_id,
                    file_category,
                    file_description,
                    display_order
                )
            VALUES
                (
                    :domain_id,
                    :file_id,
                    :file_category,
                    :file_description,
                    :display_order
                )
            """
        )

        params = {
            "domain_id": request.domain_id,
            "file_id": file_id,
            "file_category": request.file_category,
            "file_description": request.file_description,
            "display_order": request.display_order,
        }

    elif domain_type == "PRODUCT_IMAGE":
        query = text(
            """
            INSERT INTO product_images
                (
                    product_id,
                    file_id,
                    image_type,
                    alt_text,
                    display_order,
                    active_yn
                )
            VALUES
                (
                    :domain_id,
                    :file_id,
                    :image_type,
                    :alt_text,
                    :display_order,
                    'Y'
                )
            """
        )

        params = {
            "domain_id": request.domain_id,
            "file_id": file_id,
            "image_type": request.file_category or "DETAIL",
            "alt_text": request.file_description,
            "display_order": request.display_order,
        }

    elif domain_type == "INQUIRY":
        query = text(
            """
            INSERT INTO inquiry_files
                (
                    inquiry_id,
                    file_id
                )
            VALUES
                (
                    :domain_id,
                    :file_id
                )
            """
        )

        params = {
            "domain_id": request.domain_id,
            "file_id": file_id,
        }

    elif domain_type == "POLICY":
        query = text(
            """
            INSERT INTO policy_files
                (
                    policy_id,
                    file_id,
                    display_order
                )
            VALUES
                (
                    :domain_id,
                    :file_id,
                    :display_order
                )
            """
        )

        params = {
            "domain_id": request.domain_id,
            "file_id": file_id,
            "display_order": request.display_order,
        }

    elif domain_type == "RAG_DOCUMENT":
        query = text(
            """
            INSERT INTO rag_document_files
                (
                    document_id,
                    file_id
                )
            VALUES
                (
                    :domain_id,
                    :file_id
                )
            """
        )

        params = {
            "domain_id": request.domain_id,
            "file_id": file_id,
        }

    else:
        raise ValueError("지원하지 않는 도메인입니다.")

    db.execute(query, params)
    db.commit()