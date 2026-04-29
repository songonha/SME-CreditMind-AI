from __future__ import annotations

from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, LargeBinary, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class GeneratedReport(Base):
    __tablename__ = "generated_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    report_type: Mapped[str] = mapped_column(String(64), default="portfolio_summary")
    storage_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    content_bytes: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    content_mime: Mapped[str] = mapped_column(String(64), default="application/pdf")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
