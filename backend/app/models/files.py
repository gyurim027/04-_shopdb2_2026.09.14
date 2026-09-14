from datetime import datetime

from sqlalchemy import BigInteger, CHAR, DateTime, Enum, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class FileAsset(Base):
    """파일/미디어 정보를 저장하는 file_assets 테이블 모델."""

    __tablename__ = "file_assets"

    file_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )

    org_id: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )

    file_type: Mapped[str] = mapped_column(
        Enum(
            "IMAGE",
            "PDF",
            "DOCUMENT",
            "VIDEO",
            "AUDIO",
            "ETC",
        ),
        nullable=False,
    )

    storage_type: Mapped[str] = mapped_column(
        Enum(
            "LOCAL",
            "S3",
            "GCS",
            "NAS",
            "URL",
        ),
        nullable=False,
    )

    original_file_name: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    stored_file_name: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    file_extension: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    mime_type: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    file_size: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
        server_default=text("0"),
    )

    storage_path: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )

    public_url: Mapped[str | None] = mapped_column(
        String(2000),
        nullable=True,
    )

    thumbnail_url: Mapped[str | None] = mapped_column(
        String(2000),
        nullable=True,
    )

    checksum_sha256: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
    )

    active_yn: Mapped[str | None] = mapped_column(
        CHAR(1),
        nullable=True,
        server_default=text("'Y'"),
    )

    created_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        server_default=text("CURRENT_TIMESTAMP"),
    )