"""ORM models for products domain (categories, products, variants, images, files, inventories).

Use Base from app.core.database. Match the existing shopdb2 table/column names;
do not change the database schema for coding convenience.
"""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Category(Base):
    __tablename__ = "categories"

    category_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    parent_category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.category_id"), nullable=True
    )
    category_name: Mapped[str] = mapped_column(String(100), nullable=False)
    category_level: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    active_yn: Mapped[str] = mapped_column(String(1), nullable=False, default="Y")


class Product(Base):
    __tablename__ = "products"

    product_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    # users 테이블은 다른 담당자(명현) 소유 models/users.py에서 매핑하므로,
    # 여기서는 SQLAlchemy ForeignKey로 선언하지 않는다 (실제 FK 제약은 DB 스키마에 이미 있음).
    seller_user_id: Mapped[int] = mapped_column(Integer, nullable=False)
    category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.category_id"), nullable=False
    )
    product_code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    product_name: Mapped[str] = mapped_column(String(200), nullable=False)
    short_description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    regular_price: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    sale_price: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    # DB enum: READY / SALE / SOLD_OUT / STOPPED / DELETED (그대로 문자열로 다룸)
    product_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="READY"
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )


class ProductVariant(Base):
    __tablename__ = "product_variants"

    variant_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.product_id"), nullable=False
    )
    sku_code: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    option_name1: Mapped[str | None] = mapped_column(String(100), nullable=True)
    option_value1: Mapped[str | None] = mapped_column(String(100), nullable=True)
    option_name2: Mapped[str | None] = mapped_column(String(100), nullable=True)
    option_value2: Mapped[str | None] = mapped_column(String(100), nullable=True)
    additional_price: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=0
    )
    active_yn: Mapped[str] = mapped_column(String(1), nullable=False, default="Y")
