from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import String, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.organization import Organization


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    ai_calls_per_month: Mapped[int] = mapped_column(Integer, default=0)
    reports_per_month: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class OrgSubscription(Base):
    __tablename__ = "org_subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id"), unique=True, index=True
    )
    plan_id: Mapped[str] = mapped_column(ForeignKey("subscription_plans.id"))
    current_period_start: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    current_period_end: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    organization: Mapped["Organization"] = relationship(back_populates="subscription")
    plan: Mapped["SubscriptionPlan"] = relationship()
