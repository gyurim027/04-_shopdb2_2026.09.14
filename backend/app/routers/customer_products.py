from fastapi import (
    APIRouter,
    Depends,
    Query,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.customer_products import (
    CustomerCategoryResponse,
    CustomerProductDetailResponse,
    CustomerProductListResponse,
)
from app.services import customer_products as service


router = APIRouter(
    prefix="/customer/products",
    tags=["Customer Products"],
)


@router.get(
    "/categories",
    response_model=list[CustomerCategoryResponse],
)
def get_categories(
    db: Session = Depends(get_db),
) -> list[CustomerCategoryResponse]:
    """
    고객 상품 카테고리 목록 조회.

    - 활성 카테고리만 조회
    - 로그인 없이 사용 가능
    - 기존 categories 테이블 사용
    """

    return service.get_customer_categories(
        db=db,
    )


@router.get(
    "",
    response_model=CustomerProductListResponse,
)
def get_products(
    page: int = Query(
        default=1,
        ge=1,
        description="페이지 번호",
    ),
    size: int = Query(
        default=20,
        ge=1,
        le=100,
        description="페이지당 상품 수",
    ),
    category_id: int | None = Query(
        default=None,
        ge=1,
        description="카테고리 ID",
    ),
    keyword: str | None = Query(
        default=None,
        max_length=100,
        description="상품명 / 상품코드 / 설명 검색어",
    ),
    db: Session = Depends(get_db),
) -> CustomerProductListResponse:
    """
    고객 상품 목록 및 검색.

    사용 가능한 기능:
    - 전체 상품 목록
    - 페이지 처리
    - 카테고리 필터
    - 상품명 검색
    - 상품 코드 검색
    - 상품 간단 설명 검색

    고객에게 노출 가능한 상품 상태만 반환한다.
    """

    return service.get_customer_products(
        db=db,
        page=page,
        size=size,
        category_id=category_id,
        keyword=keyword,
    )


@router.get(
    "/assets/{file_id}/content",
    response_class=FileResponse,
)
def get_product_asset_content(
    file_id: int,
    db: Session = Depends(get_db),
) -> FileResponse:
    """
    고객 상품 이미지 파일 조회.

    고객에게 공개 가능한 상품의 이미지 파일만 반환한다.

    공개 조건:
    - 활성 파일
    - 상품 이미지로 연결된 파일
    - 활성 상품 이미지
    - SALE 또는 SOLD_OUT 상품
    - LOCAL 저장 파일
    - uploads 디렉터리 내부 실제 파일

    storage_path는 고객에게 직접 노출하지 않는다.
    """

    asset, file_path = (
        service.get_customer_product_asset_content(
            db=db,
            file_id=file_id,
        )
    )

    return FileResponse(
        path=str(file_path),
        media_type=(
            asset.mime_type
            or "application/octet-stream"
        ),
    )


@router.get(
    "/{product_id}",
    response_model=CustomerProductDetailResponse,
)
def get_product_detail(
    product_id: int,
    db: Session = Depends(get_db),
) -> CustomerProductDetailResponse:
    """
    고객 상품 상세 조회.

    반환 정보:
    - 상품 기본 정보
    - 카테고리
    - 상세 설명
    - 상품 이미지
    - SKU 옵션
    - 옵션별 구매 가능 재고
    - 판매사 정보

    상품 이미지에는 MAIN / DETAIL 구분과
    고객 이미지 조회용 content_url이 포함된다.
    """

    return service.get_customer_product_detail(
        db=db,
        product_id=product_id,
    )