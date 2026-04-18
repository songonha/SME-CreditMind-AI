from __future__ import annotations

from datetime import datetime
from typing import Optional, List, TYPE_CHECKING

from sqlalchemy import String, Integer, Float, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.merchant import Merchant


class CreditScore(Base):
    __tablename__ = "credit_scores"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    merchant_id: Mapped[str] = mapped_column(ForeignKey("merchants.id"), index=True)
    score: Mapped[int] = mapped_column(Integer)
    base_score: Mapped[int] = mapped_column(Integer)
    ai_adjustment: Mapped[int] = mapped_column(Integer, default=0)
    grade: Mapped[str] = mapped_column(String(1))
    risk_level: Mapped[str] = mapped_column(String(20))
    pre_approved_limit: Mapped[float] = mapped_column(Float, default=0)
    confidence: Mapped[float] = mapped_column(Float, default=0)
    recommendation: Mapped[str] = mapped_column(String(20))
    narrative: Mapped[str] = mapped_column(Text, default="")
    assessed_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    valid_until: Mapped[datetime] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    merchant: Mapped[Merchant] = relationship(back_populates="credit_scores")
    factors: Mapped[List[CreditFactor]] = relationship(
        back_populates="credit_score", cascade="all, delete-orphan"
    )


class CreditFactor(Base):
    __tablename__ = "credit_factors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    credit_score_id: Mapped[str] = mapped_column(ForeignKey("credit_scores.id"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    impact: Mapped[str] = mapped_column(String(10))
    weight: Mapped[float] = mapped_column(Float)
    description: Mapped[str] = mapped_column(Text)
    data_point: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(50))

    credit_score: Mapped[CreditScore] = relationship(back_populates="factors")
