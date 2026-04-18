from __future__ import annotations

from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.merchant import Merchant


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    merchant_id: Mapped[str] = mapped_column(ForeignKey("merchants.id"), index=True)
    amount: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(3), default="VND")
    payment_method: Mapped[str] = mapped_column(String(20))
    terminal_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    customer_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    transaction_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    merchant: Mapped[Merchant] = relationship(back_populates="transactions")


class MonthlyAggregate(Base):
    __tablename__ = "monthly_aggregates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    merchant_id: Mapped[str] = mapped_column(ForeignKey("merchants.id"), index=True)
    month: Mapped[str] = mapped_column(String(7), index=True)
    revenue: Mapped[float] = mapped_column(Float, default=0)
    transaction_count: Mapped[int] = mapped_column(Integer, default=0)
    unique_customers: Mapped[int] = mapped_column(Integer, default=0)
    avg_ticket_size: Mapped[float] = mapped_column(Float, default=0)
    digital_ratio: Mapped[float] = mapped_column(Float, default=0)
    active_days: Mapped[int] = mapped_column(Integer, default=0)
    total_days: Mapped[int] = mapped_column(Integer, default=0)
