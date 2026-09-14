"""ORM models for products domain (categories, products, variants, images, files, inventories).

Use Base from app.core.database. Match the existing shopdb2 table/column names;
do not change the database schema for coding convenience.
"""

from sqlalchemy import ForeignKey, Integer, String
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
