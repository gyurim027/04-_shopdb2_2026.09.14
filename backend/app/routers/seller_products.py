"""Router for Seller Products domain.

카테고리 조회, 상품, 옵션, 이미지, 첨부파일, 판매실적 API를 제공한다.
"""

from fastapi import APIRouter, Depends, Form, Query, UploadFile
from fastapi import File as UploadFormFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import AuthContext, require_seller
from app.schemas.seller_products import (
    SellerCategoryOut,
    SellerProductCreate,
    SellerProductFileCreate,
    SellerProductFileOut,
    SellerProductFileUpdate,
    SellerProductImageCreate,
    SellerProductImageOut,
    SellerProductImageUpdate,
    SellerProductOut,
    SellerProductPage,
    SellerProductSalesOut,
    SellerProductUpdate,
    SellerVariantCreate,
    SellerVariantOut,
    SellerVariantUpdate,
)
from app.services import seller_products as service


router = APIRouter(
    prefix="/seller/products",
    tags=["Seller Products"],
)


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------


@router.get(
    "/categories",
    response_model=list[SellerCategoryOut],
)
def list_categories(
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> list[SellerCategoryOut]:
    return service.list_categories(db)


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------
# products 테이블에는 active_yn이 없으므로 DELETE 엔드포인트를 두지 않는다.
# 판매중지/삭제는 PATCH로 product_status를 STOPPED/DELETED로 변경한다.


@router.get(
    "/products",
    response_model=SellerProductPage,
)
def list_products(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    product_status: str | None = None,
    keyword: str | None = None,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerProductPage:
    items, total = service.list_products(
        db,
        auth,
        page=page,
        size=size,
        product_status=product_status,
        keyword=keyword,
    )
    return SellerProductPage(
        items=items,
        total=total,
        page=page,
        size=size,
    )


@router.get(
    "/products/sales",
    response_model=list[SellerProductSalesOut],
)
def list_product_sales(
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> list[SellerProductSalesOut]:
    return service.list_product_sales(db, auth)


@router.get(
    "/products/{product_id}",
    response_model=SellerProductOut,
)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerProductOut:
    return service.get_product(db, product_id, auth)


@router.post(
    "/products",
    response_model=SellerProductOut,
    status_code=201,
)
def create_product(
    payload: SellerProductCreate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerProductOut:
    return service.create_product(
        db,
        payload.model_dump(),
        auth,
    )


@router.patch(
    "/products/{product_id}",
    response_model=SellerProductOut,
)
def update_product(
    product_id: int,
    payload: SellerProductUpdate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerProductOut:
    return service.update_product(
        db,
        product_id,
        payload.model_dump(exclude_unset=True),
        auth,
    )


# ---------------------------------------------------------------------------
# Product variants
# ---------------------------------------------------------------------------


@router.get(
    "/products/{product_id}/variants",
    response_model=list[SellerVariantOut],
)
def list_variants(
    product_id: int,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> list[SellerVariantOut]:
    return service.list_variants(db, product_id, auth)


@router.post(
    "/products/{product_id}/variants",
    response_model=SellerVariantOut,
    status_code=201,
)
def create_variant(
    product_id: int,
    payload: SellerVariantCreate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerVariantOut:
    return service.create_variant(
        db,
        product_id,
        payload.model_dump(),
        auth,
    )


@router.patch(
    "/variants/{variant_id}",
    response_model=SellerVariantOut,
)
def update_variant(
    variant_id: int,
    payload: SellerVariantUpdate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerVariantOut:
    return service.update_variant(
        db,
        variant_id,
        payload.model_dump(exclude_unset=True),
        auth,
    )


@router.delete(
    "/variants/{variant_id}",
    status_code=204,
)
def deactivate_variant(
    variant_id: int,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> None:
    service.deactivate_variant(db, variant_id, auth)


# ---------------------------------------------------------------------------
# Product images
# ---------------------------------------------------------------------------


@router.get(
    "/products/{product_id}/images",
    response_model=list[SellerProductImageOut],
)
def list_images(
    product_id: int,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> list[SellerProductImageOut]:
    return service.list_images(db, product_id, auth)


@router.post(
    "/products/{product_id}/images",
    response_model=SellerProductImageOut,
    status_code=201,
)
def create_image(
    product_id: int,
    payload: SellerProductImageCreate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerProductImageOut:
    """기존 file_assets 파일을 상품 이미지로 연결한다."""

    return service.create_image(
        db,
        product_id,
        payload.model_dump(),
        auth,
    )


@router.post(
    "/products/{product_id}/images/upload",
    response_model=SellerProductImageOut,
    status_code=201,
)
async def upload_image(
    product_id: int,
    file: UploadFile = UploadFormFile(...),
    image_type: str = Form(default="DETAIL"),
    alt_text: str | None = Form(default=None, max_length=500),
    display_order: int = Form(default=0, ge=0),
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerProductImageOut:
    """이미지를 저장하고 file_assets와 product_images에 함께 등록한다."""

    return await service.upload_product_image(
        db,
        product_id=product_id,
        file=file,
        image_type=image_type,
        alt_text=alt_text,
        display_order=display_order,
        auth=auth,
    )


@router.patch(
    "/images/{product_image_id}",
    response_model=SellerProductImageOut,
)
def update_image(
    product_image_id: int,
    payload: SellerProductImageUpdate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerProductImageOut:
    return service.update_image(
        db,
        product_image_id,
        payload.model_dump(exclude_unset=True),
        auth,
    )


@router.delete(
    "/images/{product_image_id}",
    status_code=204,
)
def deactivate_image(
    product_image_id: int,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> None:
    service.deactivate_image(db, product_image_id, auth)


# ---------------------------------------------------------------------------
# Product files
# ---------------------------------------------------------------------------
# product_files에는 active_yn이 없으므로 연결 행은 실제 DELETE로 처리한다.


@router.get(
    "/products/{product_id}/files",
    response_model=list[SellerProductFileOut],
)
def list_files(
    product_id: int,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> list[SellerProductFileOut]:
    return service.list_files(db, product_id, auth)


@router.post(
    "/products/{product_id}/files",
    response_model=SellerProductFileOut,
    status_code=201,
)
def create_file(
    product_id: int,
    payload: SellerProductFileCreate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerProductFileOut:
    """기존 file_assets 파일을 상품 첨부파일로 연결한다."""

    return service.create_file(
        db,
        product_id,
        payload.model_dump(),
        auth,
    )


@router.post(
    "/products/{product_id}/files/upload",
    response_model=SellerProductFileOut,
    status_code=201,
)
async def upload_file(
    product_id: int,
    file: UploadFile = UploadFormFile(...),
    file_category: str = Form(default="ETC", max_length=50),
    file_description: str | None = Form(default=None, max_length=500),
    display_order: int = Form(default=0, ge=0),
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerProductFileOut:
    """문서를 저장하고 file_assets와 product_files에 함께 등록한다."""

    return await service.upload_product_file(
        db,
        product_id=product_id,
        file=file,
        file_category=file_category,
        file_description=file_description,
        display_order=display_order,
        auth=auth,
    )


@router.patch(
    "/files/{product_file_id}",
    response_model=SellerProductFileOut,
)
def update_file(
    product_file_id: int,
    payload: SellerProductFileUpdate,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerProductFileOut:
    return service.update_file(
        db,
        product_file_id,
        payload.model_dump(exclude_unset=True),
        auth,
    )


@router.delete(
    "/files/{product_file_id}",
    status_code=204,
)
def delete_file(
    product_file_id: int,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> None:
    service.delete_file(db, product_file_id, auth)


# ---------------------------------------------------------------------------
# File preview and download
# ---------------------------------------------------------------------------


@router.get(
    "/assets/{file_id}/content",
    response_class=FileResponse,
)
def get_asset_content(
    file_id: int,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> FileResponse:
    """로그인한 셀러의 상품에 연결된 파일만 반환한다."""

    asset, file_path = service.get_owned_asset_content(
        db,
        file_id,
        auth,
    )

    return FileResponse(
        path=str(file_path),
        media_type=asset.mime_type or "application/octet-stream",
        filename=asset.original_file_name or file_path.name,
    )
