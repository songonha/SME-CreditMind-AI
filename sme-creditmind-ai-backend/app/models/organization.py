from __future__ import annotations

from datetime import datetime
from typing import List, TYPE_CHECKING

from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.membership import Membership
    from app.models.merchant import Merchant
    from app.models.subscription import OrgSubscription


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    memberships: Mapped[List["Membership"]] = relationship(back_populates="organization")
    merchants: Mapped[List["Merchant"]] = relationship(back_populates="organization")
    subscription: Mapped["OrgSubscription | None"] = relationship(
        back_populates="organization", uselist=False
    )
