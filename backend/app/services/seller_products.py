"""Service layer for seller_products.

카테고리, 상품, 옵션, 상품 이미지, 첨부파일, 판매실적을 처리한다.
DB 스키마는 변경하지 않고 기존 file_assets/product_images/product_files를 사용한다.
"""

import hashlib
import uuid
from decimal import Decimal
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.dependencies.auth import AuthContext
from app.models.files import FileAsset
from app.models.products import (
    Category,
    Product,
    ProductFile,
    ProductImage,
    ProductVariant,
)


SELLER_UPLOAD_DIR = Path("uploads/seller-products")

MAX_PRODUCT_IMAGES = 10
MAX_PRODUCT_FILES = 5
MAX_IMAGE_SIZE = 10 * 1024 * 1024
MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024

ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
ALLOWED_IMAGE_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}

ALLOWED_ATTACHMENT_MIME_TYPES = {
    "pdf": {"application/pdf"},
    "doc": {"application/msword", "application/octet-stream"},
    "docx": {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/zip",
    },
    "xls": {"application/vnd.ms-excel", "application/octet-stream"},
    "xlsx": {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/zip",
    },
    "ppt": {"application/vnd.ms-powerpoint", "application/octet-stream"},
    "pptx": {
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/zip",
    },
    "hwp": {
        "application/x-hwp",
        "application/haansofthwp",
        "application/vnd.hancom.hwp",
        "application/octet-stream",
    },
}

ALLOWED_FILE_CATEGORIES = {
    "MANUAL",
    "CERTIFICATE",
    "SIZE_GUIDE",
    "ETC",
}


def _not_found(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=detail,
    )


def _bad_request(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=detail,
    )


def _conflict(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=detail,
    )


def _asset_content_url(file_id: int) -> str:
    prefix = settings.api_prefix.rstrip("/")
    return f"{prefix}/seller/products/assets/{file_id}/content"


def _asset_out(asset: FileAsset | None) -> dict | None:
    if asset is None:
        return None

    return {
        "file_id": asset.file_id,
        "original_file_name": asset.original_file_name,
        "file_extension": asset.file_extension,
        "mime_type": asset.mime_type,
        "file_size": asset.file_size or 0,
        "active_yn": asset.active_yn or "Y",
        "content_url": _asset_content_url(asset.file_id),
    }


def _image_out(db: Session, image: ProductImage) -> dict:
    return {
        "product_image_id": image.product_image_id,
        "product_id": image.product_id,
        "file_id": image.file_id,
        "image_type": image.image_type,
        "alt_text": image.alt_text,
        "display_order": image.display_order,
        "active_yn": image.active_yn,
        "created_at": image.created_at,
        "file": _asset_out(db.get(FileAsset, image.file_id)),
    }


def _product_file_out(db: Session, file_row: ProductFile) -> dict:
    return {
        "product_file_id": file_row.product_file_id,
        "product_id": file_row.product_id,
        "file_id": file_row.file_id,
        "file_category": file_row.file_category,
        "file_description": file_row.file_description,
        "display_order": file_row.display_order,
        "created_at": file_row.created_at,
        "file": _asset_out(db.get(FileAsset, file_row.file_id)),
    }


def _original_file_info(file: UploadFile) -> tuple[str, str, str]:
    if not file.filename:
        raise _bad_request("파일 이름이 없습니다.")

    original_name = Path(file.filename).name
    extension = Path(original_name).suffix.lower().lstrip(".")
    mime_type = (file.content_type or "").lower()

    if not extension:
        raise _bad_request("파일 확장자를 확인할 수 없습니다.")

    return original_name, extension, mime_type


def _validate_image_signature(content: bytes, extension: str) -> None:
    is_valid = False

    if extension in {"jpg", "jpeg"}:
        is_valid = content.startswith(b"\xff\xd8\xff")
    elif extension == "png":
        is_valid = content.startswith(b"\x89PNG\r\n\x1a\n")
    elif extension == "webp":
        is_valid = (
            len(content) >= 12
            and content.startswith(b"RIFF")
            and content[8:12] == b"WEBP"
        )

    if not is_valid:
        raise _bad_request("이미지 파일의 실제 형식이 확장자와 일치하지 않습니다.")


def _create_file_asset(
    db: Session,
    *,
    auth: AuthContext,
    file_type: str,
    original_name: str,
    stored_name: str,
    extension: str,
    mime_type: str,
    content: bytes,
    file_path: Path,
) -> FileAsset:
    asset = FileAsset(
        org_id=auth.org_id,
        file_type=file_type,
        storage_type="LOCAL",
        original_file_name=original_name,
        stored_file_name=stored_name,
        file_extension=extension,
        mime_type=mime_type or None,
        file_size=len(content),
        storage_path=file_path.as_posix(),
        public_url=None,
        thumbnail_url=None,
        checksum_sha256=hashlib.sha256(content).hexdigest(),
        active_yn="Y",
    )
    db.add(asset)
    db.flush()
    return asset


def _validate_owned_asset(
    db: Session,
    *,
    file_id: int,
    auth: AuthContext,
    required_type: str,
) -> FileAsset:
    asset = db.get(FileAsset, file_id)

    if asset is None or asset.active_yn == "N":
        raise _not_found("파일을 찾을 수 없습니다.")

    if asset.org_id != auth.org_id:
        raise _not_found("파일을 찾을 수 없습니다.")

    if required_type == "IMAGE" and asset.file_type != "IMAGE":
        raise _bad_request("이미지 파일만 상품 이미지로 등록할 수 있습니다.")

    if required_type == "DOCUMENT" and asset.file_type not in {"PDF", "DOCUMENT"}:
        raise _bad_request("허용된 문서 파일만 첨부할 수 있습니다.")

    return asset


def _demote_current_main(
    db: Session,
    *,
    product_id: int,
    except_image_id: int | None = None,
) -> None:
    query = db.query(ProductImage).filter(
        ProductImage.product_id == product_id,
        ProductImage.image_type == "MAIN",
        ProductImage.active_yn == "Y",
    )

    if except_image_id is not None:
        query = query.filter(ProductImage.product_image_id != except_image_id)

    for image in query.all():
        image.image_type = "DETAIL"


def _ensure_main_image(db: Session, product_id: int) -> None:
    current_main = (
        db.query(ProductImage)
        .filter(
            ProductImage.product_id == product_id,
            ProductImage.image_type == "MAIN",
            ProductImage.active_yn == "Y",
        )
        .first()
    )

    if current_main is not None:
        return

    first_image = (
        db.query(ProductImage)
        .filter(
            ProductImage.product_id == product_id,
            ProductImage.active_yn == "Y",
        )
        .order_by(
            ProductImage.display_order,
            ProductImage.product_image_id,
        )
        .first()
    )

    if first_image is not None:
        first_image.image_type = "MAIN"


def _deactivate_asset_if_unused(db: Session, file_id: int) -> None:
    active_image_count = (
        db.query(ProductImage)
        .filter(
            ProductImage.file_id == file_id,
            ProductImage.active_yn == "Y",
        )
        .count()
    )
    product_file_count = (
        db.query(ProductFile)
        .filter(ProductFile.file_id == file_id)
        .count()
    )

    if active_image_count == 0 and product_file_count == 0:
        asset = db.get(FileAsset, file_id)
        if asset is not None:
            asset.active_yn = "N"


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------


def list_categories(db: Session) -> list[Category]:
    return list(
        db.query(Category)
        .filter(Category.active_yn == "Y")
        .order_by(Category.category_level, Category.display_order)
        .all()
    )


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------


def list_products(
    db: Session,
    auth: AuthContext,
    page: int = 1,
    size: int = 20,
    product_status: str | None = None,
    keyword: str | None = None,
) -> tuple[list[Product], int]:
    query = db.query(Product).filter(Product.seller_user_id == auth.user_id)

    if product_status is not None:
        query = query.filter(Product.product_status == product_status)

    if keyword:
        query = query.filter(Product.product_name.like(f"%{keyword}%"))

    total = query.count()
    items = (
        query.order_by(Product.updated_at.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )
    return list(items), total


def get_product(db: Session, product_id: int, auth: AuthContext) -> Product:
    product = (
        db.query(Product)
        .filter(
            Product.product_id == product_id,
            Product.seller_user_id == auth.user_id,
        )
        .first()
    )

    if product is None:
        raise _not_found("상품을 찾을 수 없습니다.")

    return product


def create_product(db: Session, data: dict, auth: AuthContext) -> Product:
    product = Product(**data, seller_user_id=auth.user_id)
    db.add(product)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise _conflict("이미 존재하는 상품코드입니다.") from exc

    db.refresh(product)
    return product


def update_product(
    db: Session,
    product_id: int,
    data: dict,
    auth: AuthContext,
) -> Product:
    product = get_product(db, product_id, auth)

    for key, value in data.items():
        if value is not None:
            setattr(product, key, value)

    db.commit()
    db.refresh(product)
    return product


# ---------------------------------------------------------------------------
# Product variants
# ---------------------------------------------------------------------------


def list_variants(
    db: Session,
    product_id: int,
    auth: AuthContext,
) -> list[ProductVariant]:
    get_product(db, product_id, auth)
    return list(
        db.query(ProductVariant)
        .filter(ProductVariant.product_id == product_id)
        .order_by(ProductVariant.variant_id)
        .all()
    )


def _get_owned_variant(
    db: Session,
    variant_id: int,
    auth: AuthContext,
) -> ProductVariant:
    variant = db.get(ProductVariant, variant_id)

    if variant is None:
        raise _not_found("옵션(SKU)을 찾을 수 없습니다.")

    get_product(db, variant.product_id, auth)
    return variant


def create_variant(
    db: Session,
    product_id: int,
    data: dict,
    auth: AuthContext,
) -> ProductVariant:
    get_product(db, product_id, auth)
    variant = ProductVariant(product_id=product_id, **data)
    db.add(variant)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise _conflict("이미 존재하는 SKU 코드입니다.") from exc

    db.refresh(variant)
    return variant


def update_variant(
    db: Session,
    variant_id: int,
    data: dict,
    auth: AuthContext,
) -> ProductVariant:
    variant = _get_owned_variant(db, variant_id, auth)

    for key, value in data.items():
        if value is not None:
            setattr(variant, key, value)

    db.commit()
    db.refresh(variant)
    return variant


def deactivate_variant(
    db: Session,
    variant_id: int,
    auth: AuthContext,
) -> None:
    variant = _get_owned_variant(db, variant_id, auth)
    variant.active_yn = "N"
    db.commit()


# ---------------------------------------------------------------------------
# Product images
# ---------------------------------------------------------------------------


def list_images(
    db: Session,
    product_id: int,
    auth: AuthContext,
) -> list[dict]:
    get_product(db, product_id, auth)
    images = (
        db.query(ProductImage)
        .filter(
            ProductImage.product_id == product_id,
            ProductImage.active_yn == "Y",
        )
        .order_by(
            ProductImage.display_order,
            ProductImage.product_image_id,
        )
        .all()
    )
    return [_image_out(db, image) for image in images]


def _get_owned_image(
    db: Session,
    product_image_id: int,
    auth: AuthContext,
) -> ProductImage:
    image = db.get(ProductImage, product_image_id)

    if image is None:
        raise _not_found("상품 이미지를 찾을 수 없습니다.")

    get_product(db, image.product_id, auth)
    return image


def create_image(
    db: Session,
    product_id: int,
    data: dict,
    auth: AuthContext,
) -> dict:
    get_product(db, product_id, auth)

    image_count = (
        db.query(ProductImage)
        .filter(
            ProductImage.product_id == product_id,
            ProductImage.active_yn == "Y",
        )
        .count()
    )
    if image_count >= MAX_PRODUCT_IMAGES:
        raise _bad_request("상품 이미지는 최대 10개까지 등록할 수 있습니다.")

    _validate_owned_asset(
        db,
        file_id=data["file_id"],
        auth=auth,
        required_type="IMAGE",
    )

    duplicate = (
        db.query(ProductImage)
        .filter(
            ProductImage.product_id == product_id,
            ProductImage.file_id == data["file_id"],
            ProductImage.active_yn == "Y",
        )
        .first()
    )
    if duplicate is not None:
        raise _conflict("이미 등록된 상품 이미지입니다.")

    requested_type = data.get("image_type", "DETAIL")

    if image_count == 0:
        requested_type = "MAIN"
    elif requested_type == "MAIN":
        _demote_current_main(db, product_id=product_id)

    image = ProductImage(
        product_id=product_id,
        file_id=data["file_id"],
        image_type=requested_type,
        alt_text=data.get("alt_text"),
        display_order=data.get("display_order", 0),
        active_yn="Y",
    )
    db.add(image)
    db.commit()
    db.refresh(image)
    return _image_out(db, image)


async def upload_product_image(
    db: Session,
    *,
    product_id: int,
    file: UploadFile,
    image_type: str,
    alt_text: str | None,
    display_order: int,
    auth: AuthContext,
) -> dict:
    get_product(db, product_id, auth)

    image_count = (
        db.query(ProductImage)
        .filter(
            ProductImage.product_id == product_id,
            ProductImage.active_yn == "Y",
        )
        .count()
    )
    if image_count >= MAX_PRODUCT_IMAGES:
        raise _bad_request("상품 이미지는 최대 10개까지 등록할 수 있습니다.")

    original_name, extension, mime_type = _original_file_info(file)

    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise _bad_request("JPG, JPEG, PNG, WebP 이미지만 등록할 수 있습니다.")

    if mime_type not in ALLOWED_IMAGE_MIME_TYPES:
        raise _bad_request("허용되지 않는 이미지 형식입니다.")

    content = await file.read()

    if not content:
        raise _bad_request("빈 파일은 업로드할 수 없습니다.")

    if len(content) > MAX_IMAGE_SIZE:
        raise _bad_request("상품 이미지는 파일당 10MB까지 등록할 수 있습니다.")

    _validate_image_signature(content, extension)

    if image_type not in {"MAIN", "DETAIL"}:
        raise _bad_request("대표 이미지 또는 상세 이미지만 등록할 수 있습니다.")

    if alt_text is not None and len(alt_text) > 500:
        raise _bad_request("이미지 설명은 500자 이내로 입력해 주세요.")

    if display_order < 0:
        raise _bad_request("이미지 순서는 0 이상이어야 합니다.")

    stored_name = f"{uuid.uuid4().hex}.{extension}"
    SELLER_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    file_path = SELLER_UPLOAD_DIR / stored_name

    try:
        file_path.write_bytes(content)

        asset = _create_file_asset(
            db,
            auth=auth,
            file_type="IMAGE",
            original_name=original_name,
            stored_name=stored_name,
            extension=extension,
            mime_type=mime_type,
            content=content,
            file_path=file_path,
        )

        requested_type = "MAIN" if image_count == 0 else image_type
        if requested_type == "MAIN":
            _demote_current_main(db, product_id=product_id)

        image = ProductImage(
            product_id=product_id,
            file_id=asset.file_id,
            image_type=requested_type,
            alt_text=alt_text,
            display_order=display_order,
            active_yn="Y",
        )
        db.add(image)
        db.commit()
        db.refresh(image)
        return _image_out(db, image)

    except HTTPException:
        db.rollback()
        if file_path.exists():
            file_path.unlink()
        raise
    except Exception as exc:
        db.rollback()
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="이미지 저장 중 오류가 발생했습니다.",
        ) from exc


def update_image(
    db: Session,
    product_image_id: int,
    data: dict,
    auth: AuthContext,
) -> dict:
    image = _get_owned_image(db, product_image_id, auth)

    if data.get("active_yn") == "Y" and image.active_yn == "N":
        image_count = (
            db.query(ProductImage)
            .filter(
                ProductImage.product_id == image.product_id,
                ProductImage.active_yn == "Y",
            )
            .count()
        )
        if image_count >= MAX_PRODUCT_IMAGES:
            raise _bad_request("상품 이미지는 최대 10개까지 등록할 수 있습니다.")

    if data.get("image_type") == "MAIN":
        _demote_current_main(
            db,
            product_id=image.product_id,
            except_image_id=image.product_image_id,
        )

    for key, value in data.items():
        if value is not None:
            setattr(image, key, value)

    _ensure_main_image(db, image.product_id)
    db.commit()
    db.refresh(image)
    return _image_out(db, image)


def deactivate_image(
    db: Session,
    product_image_id: int,
    auth: AuthContext,
) -> None:
    image = _get_owned_image(db, product_image_id, auth)
    image.active_yn = "N"
    db.flush()

    _ensure_main_image(db, image.product_id)
    _deactivate_asset_if_unused(db, image.file_id)
    db.commit()


# ---------------------------------------------------------------------------
# Product files
# ---------------------------------------------------------------------------


def list_files(
    db: Session,
    product_id: int,
    auth: AuthContext,
) -> list[dict]:
    get_product(db, product_id, auth)
    file_rows = (
        db.query(ProductFile)
        .filter(ProductFile.product_id == product_id)
        .order_by(
            ProductFile.display_order,
            ProductFile.product_file_id,
        )
        .all()
    )
    return [_product_file_out(db, file_row) for file_row in file_rows]


def _get_owned_file(
    db: Session,
    product_file_id: int,
    auth: AuthContext,
) -> ProductFile:
    file_row = db.get(ProductFile, product_file_id)

    if file_row is None:
        raise _not_found("상품 첨부파일을 찾을 수 없습니다.")

    get_product(db, file_row.product_id, auth)
    return file_row


def create_file(
    db: Session,
    product_id: int,
    data: dict,
    auth: AuthContext,
) -> dict:
    get_product(db, product_id, auth)

    file_count = (
        db.query(ProductFile)
        .filter(ProductFile.product_id == product_id)
        .count()
    )
    if file_count >= MAX_PRODUCT_FILES:
        raise _bad_request("상품 첨부파일은 최대 5개까지 등록할 수 있습니다.")

    _validate_owned_asset(
        db,
        file_id=data["file_id"],
        auth=auth,
        required_type="DOCUMENT",
    )

    duplicate = (
        db.query(ProductFile)
        .filter(
            ProductFile.product_id == product_id,
            ProductFile.file_id == data["file_id"],
        )
        .first()
    )
    if duplicate is not None:
        raise _conflict("이미 등록된 상품 첨부파일입니다.")

    category = (data.get("file_category") or "ETC").upper()
    if category not in ALLOWED_FILE_CATEGORIES:
        raise _bad_request("허용되지 않는 첨부파일 분류입니다.")

    file_row = ProductFile(
        product_id=product_id,
        file_id=data["file_id"],
        file_category=category,
        file_description=data.get("file_description"),
        display_order=data.get("display_order", 0),
    )
    db.add(file_row)
    db.commit()
    db.refresh(file_row)
    return _product_file_out(db, file_row)


async def upload_product_file(
    db: Session,
    *,
    product_id: int,
    file: UploadFile,
    file_category: str,
    file_description: str | None,
    display_order: int,
    auth: AuthContext,
) -> dict:
    get_product(db, product_id, auth)

    file_count = (
        db.query(ProductFile)
        .filter(ProductFile.product_id == product_id)
        .count()
    )
    if file_count >= MAX_PRODUCT_FILES:
        raise _bad_request("상품 첨부파일은 최대 5개까지 등록할 수 있습니다.")

    original_name, extension, mime_type = _original_file_info(file)
    allowed_mime_types = ALLOWED_ATTACHMENT_MIME_TYPES.get(extension)

    if allowed_mime_types is None:
        raise _bad_request(
            "PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, HWP 파일만 등록할 수 있습니다."
        )

    if mime_type not in allowed_mime_types:
        raise _bad_request("파일 확장자와 파일 형식이 일치하지 않습니다.")

    content = await file.read()

    if not content:
        raise _bad_request("빈 파일은 업로드할 수 없습니다.")

    if len(content) > MAX_ATTACHMENT_SIZE:
        raise _bad_request("상품 첨부파일은 파일당 20MB까지 등록할 수 있습니다.")

    if extension == "pdf" and not content.startswith(b"%PDF-"):
        raise _bad_request("PDF 파일의 실제 형식이 올바르지 않습니다.")

    category = (file_category or "ETC").upper()
    if category not in ALLOWED_FILE_CATEGORIES:
        raise _bad_request("허용되지 않는 첨부파일 분류입니다.")

    if file_description is not None and len(file_description) > 500:
        raise _bad_request("첨부파일 설명은 500자 이내로 입력해 주세요.")

    if display_order < 0:
        raise _bad_request("첨부파일 순서는 0 이상이어야 합니다.")

    stored_name = f"{uuid.uuid4().hex}.{extension}"
    SELLER_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    file_path = SELLER_UPLOAD_DIR / stored_name
    file_type = "PDF" if extension == "pdf" else "DOCUMENT"

    try:
        file_path.write_bytes(content)

        asset = _create_file_asset(
            db,
            auth=auth,
            file_type=file_type,
            original_name=original_name,
            stored_name=stored_name,
            extension=extension,
            mime_type=mime_type,
            content=content,
            file_path=file_path,
        )

        file_row = ProductFile(
            product_id=product_id,
            file_id=asset.file_id,
            file_category=category,
            file_description=file_description,
            display_order=display_order,
        )
        db.add(file_row)
        db.commit()
        db.refresh(file_row)
        return _product_file_out(db, file_row)

    except HTTPException:
        db.rollback()
        if file_path.exists():
            file_path.unlink()
        raise
    except Exception as exc:
        db.rollback()
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="첨부파일 저장 중 오류가 발생했습니다.",
        ) from exc


def update_file(
    db: Session,
    product_file_id: int,
    data: dict,
    auth: AuthContext,
) -> dict:
    file_row = _get_owned_file(db, product_file_id, auth)

    if data.get("file_category") is not None:
        category = data["file_category"].upper()
        if category not in ALLOWED_FILE_CATEGORIES:
            raise _bad_request("허용되지 않는 첨부파일 분류입니다.")
        data["file_category"] = category

    for key, value in data.items():
        if value is not None:
            setattr(file_row, key, value)

    db.commit()
    db.refresh(file_row)
    return _product_file_out(db, file_row)


def delete_file(
    db: Session,
    product_file_id: int,
    auth: AuthContext,
) -> None:
    file_row = _get_owned_file(db, product_file_id, auth)
    file_id = file_row.file_id
    db.delete(file_row)
    db.flush()

    _deactivate_asset_if_unused(db, file_id)
    db.commit()


def get_owned_asset_content(
    db: Session,
    file_id: int,
    auth: AuthContext,
) -> tuple[FileAsset, Path]:
    asset = db.get(FileAsset, file_id)

    if asset is None or asset.active_yn == "N":
        raise _not_found("파일을 찾을 수 없습니다.")

    image_link = (
        db.query(ProductImage)
        .join(Product, Product.product_id == ProductImage.product_id)
        .filter(
            ProductImage.file_id == file_id,
            ProductImage.active_yn == "Y",
            Product.seller_user_id == auth.user_id,
        )
        .first()
    )
    file_link = (
        db.query(ProductFile)
        .join(Product, Product.product_id == ProductFile.product_id)
        .filter(
            ProductFile.file_id == file_id,
            Product.seller_user_id == auth.user_id,
        )
        .first()
    )

    if image_link is None and file_link is None:
        raise _not_found("파일을 찾을 수 없습니다.")

    if asset.storage_type != "LOCAL" or not asset.storage_path:
        raise _not_found("서버에 저장된 파일을 찾을 수 없습니다.")

    file_path = Path(asset.storage_path).resolve()
    uploads_root = Path("uploads").resolve()

    if not file_path.is_relative_to(uploads_root) or not file_path.is_file():
        raise _not_found("서버에 저장된 파일을 찾을 수 없습니다.")

    return asset, file_path


# ---------------------------------------------------------------------------
# Product sales
# ---------------------------------------------------------------------------


def list_product_sales(db: Session, auth: AuthContext) -> list[dict]:
    rows = db.execute(
        text(
            """
            SELECT
                p.product_id,
                p.product_name,
                COALESCE(SUM(oi.quantity), 0) AS sold_quantity,
                COALESCE(SUM(oi.item_amount), 0) AS sold_amount
            FROM products p
            LEFT JOIN order_items oi ON oi.product_id = p.product_id
            WHERE p.seller_user_id = :seller_user_id
            GROUP BY p.product_id, p.product_name
            ORDER BY sold_amount DESC
            """
        ),
        {"seller_user_id": auth.user_id},
    ).all()

    return [
        {
            "product_id": row.product_id,
            "product_name": row.product_name,
            "sold_quantity": int(row.sold_quantity),
            "sold_amount": Decimal(row.sold_amount),
        }
        for row in rows
    ]
