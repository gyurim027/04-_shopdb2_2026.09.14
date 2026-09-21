"""Seller Returns API router (S-RET-01~07).

라우터는 프론트엔드의 HTTP 요청을 받아
서비스 함수로 전달하는 역할을 한다.

실제 DB 조회와 수정은
app.services.seller_returns에서 처리한다.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import (
    AuthContext,
    require_seller,
)
from app.schemas.seller_returns import (
    SellerReturnDecisionRequest,
    SellerReturnDetailOut,
    SellerReturnInspectionUpdateRequest,
    SellerReturnListOut,
    SellerReturnPickupUpdateRequest,
)
from app.services import seller_returns as service


# 이 라우터의 모든 주소 앞에 /seller/returns가 붙는다.
# 예: GET /api/seller/returns/requests
router = APIRouter(
    prefix="/seller/returns",
    tags=["Seller Returns"],
)


@router.get(
    "/requests",
    response_model=SellerReturnListOut,
)
def list_return_requests(
    # Query는 URL 쿼리 파라미터의 기본값과 유효성 검사를 설정한다.
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
    return_status: str | None = Query(
        default=None,
        description="반품 상태 필터",
    ),
    keyword: str | None = Query(
        default=None,
        description="주문번호, 고객명, 상품명 검색",
    ),
    # Depends(get_db)는 요청마다 DB 세션을 전달한다.
    db: Session = Depends(get_db),
    # require_seller는 JWT에 SELLER 역할이 있는지 검사한다.
    auth: AuthContext = Depends(require_seller),
) -> SellerReturnListOut:
    """현재 로그인한 판매자의 반품 요청 목록을 조회한다."""

    return service.list_return_requests(
        db=db,
        auth=auth,
        page=page,
        size=size,
        return_status=return_status,
        keyword=keyword,
    )


@router.get(
    "/requests/{return_request_id}",
    response_model=SellerReturnDetailOut,
)
def get_return_detail(
    # URL의 {return_request_id} 값이 이 변수로 들어온다.
    return_request_id: int,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerReturnDetailOut:
    """반품 요청과 반품 상품의 상세 정보를 조회한다."""

    return service.get_return_detail(
        db=db,
        return_request_id=return_request_id,
        auth=auth,
    )


@router.patch(
    "/requests/{return_request_id}/pickup",
    response_model=SellerReturnDetailOut,
)
def update_return_pickup(
    return_request_id: int,
    # 요청 본문의 JSON을 Pydantic 스키마로 검사한다.
    payload: SellerReturnPickupUpdateRequest,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerReturnDetailOut:
    """택배사, 운송장 번호와 회수 진행 상태를 변경한다."""

    return service.update_pickup(
        db=db,
        return_request_id=return_request_id,
        payload=payload,
        auth=auth,
    )


@router.patch(
    "/items/{return_item_id}/inspection",
    response_model=SellerReturnDetailOut,
)
def update_return_item_inspection(
    return_item_id: int,
    payload: SellerReturnInspectionUpdateRequest,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerReturnDetailOut:
    """반품 상품 한 건의 상품 상태와 검수 결과를 저장한다."""

    return service.update_item_inspection(
        db=db,
        return_item_id=return_item_id,
        payload=payload,
        auth=auth,
    )


@router.patch(
    "/requests/{return_request_id}/decision",
    response_model=SellerReturnDetailOut,
)
def decide_return_request(
    return_request_id: int,
    payload: SellerReturnDecisionRequest,
    db: Session = Depends(get_db),
    auth: AuthContext = Depends(require_seller),
) -> SellerReturnDetailOut:
    """검수가 끝난 반품 요청을 판매자가 승인하거나 반려한다."""

    return service.decide_return(
        db=db,
        return_request_id=return_request_id,
        payload=payload,
        auth=auth,
    )