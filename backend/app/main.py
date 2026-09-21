from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.routers import admin_db

from app.core.config import settings
from app.core.database import get_db
from app.routers import (
    admin_ai,
    admin_files,
    admin_orders,
    admin_products,
    admin_refunds,
    admin_support,
    admin_users,
    auth,
    customer_addresses,
    customer_ai,
    customer_auth,
    customer_cart,
    customer_orders,
    customer_payments,
    customer_products,
    customer_profile,
    customer_refunds,
    customer_returns,
    customer_support,
    seller_dashboard,
    seller_info,
    seller_inventory,
    seller_orders,
    seller_products,
    seller_refunds,
    seller_returns,  # 신규: 셀러 반품 API
    seller_sales,
)


# FastAPI 애플리케이션 객체를 생성한다.
app = FastAPI(
    title="team4_shopdb2 Backend",
    version="0.1.0",
    description="Shared FastAPI skeleton for the shopdb2 team project.",
)


# 프론트엔드가 다른 포트에서 백엔드 API를 호출할 수 있도록 허용한다.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["System"])
def health() -> dict[str, str]:
    """백엔드 서버가 실행 중인지 확인한다."""

    return {
        "status": "ok",
        "service": "shopdb2-backend",
    }


@app.get("/health/db", tags=["System"])
def health_db(
    db: Session = Depends(get_db),
) -> dict[str, str | int]:
    """백엔드에서 DB에 정상적으로 접속할 수 있는지 확인한다."""

    db.execute(text("SELECT 1"))

    return {
        "status": "ok",
        "database": settings.db_name,
        "host": settings.db_host,
        "port": settings.db_port,
    }


# 작성한 라우터를 FastAPI 앱에 등록한다.
# 이 목록에 포함되지 않은 라우터는 Swagger에도 표시되지 않는다.
for router in (
    auth.router,
    admin_users.router,
    admin_products.router,
    admin_orders.router,
    admin_refunds.router,
    admin_files.router,
    admin_support.router,
    admin_ai.router,
    customer_auth.router,
    customer_profile.router,
    customer_addresses.router,
    customer_products.router,
    customer_cart.router,
    customer_orders.router,
    customer_payments.router,
    customer_refunds.router,
    customer_returns.router,
    customer_support.router,
    customer_ai.router,
    seller_dashboard.router,
    seller_products.router,
    seller_inventory.router,
    seller_orders.router,
    seller_refunds.router,
    seller_returns.router,  # 신규: 셀러 반품 라우터 등록
    seller_sales.router,
    seller_info.router,
):
    # settings.api_prefix가 "/api"라면
    # 최종 주소는 /api/seller/returns/... 형태가 된다.
    app.include_router(
        router,
        prefix=settings.api_prefix,
    )
    app.include_router(admin_db.router)