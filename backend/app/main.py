from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

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
    seller_sales,
)


app = FastAPI(
    title="team4_shopdb2 Backend",
    version="0.1.0",
    description="Shared FastAPI skeleton for the shopdb2 team project.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["System"])
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "shopdb2-backend",
    }


@app.get("/health/db", tags=["System"])
def health_db(
    db: Session = Depends(get_db),
) -> dict[str, str | int]:
    db.execute(text("SELECT 1"))

    return {
        "status": "ok",
        "database": settings.db_name,
        "host": settings.db_host,
        "port": settings.db_port,
    }


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
    seller_sales.router,
    seller_info.router,
):
    app.include_router(
        router,
        prefix=settings.api_prefix,
    )