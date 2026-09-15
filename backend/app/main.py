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
    customer_addresses,
    customer_auth,
    customer_orders,
    customer_payments,
    customer_products,
    customer_profile,
    customer_refunds,
    customer_support,
)


app = FastAPI(
    title="shopdb2 Admin Backend",
    version="0.1.0",
    description="Shared FastAPI skeleton for the shopdb2 team project.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
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
    customer_support.router,
):
    app.include_router(
        router,
        prefix=settings.api_prefix,
    )