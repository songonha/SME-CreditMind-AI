from __future__ import annotations

from calendar import monthrange
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.ai_usage import AiUsageEvent
from app.models.subscription import OrgSubscription, SubscriptionPlan


def _month_start_utc(now: datetime | None = None) -> datetime:
    n = now or datetime.now(timezone.utc)
    return n.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _month_end_utc(now: datetime | None = None) -> datetime:
    n = now or datetime.now(timezone.utc)
    last = monthrange(n.year, n.month)[1]
    return n.replace(day=last, hour=23, minute=59, second=59, microsecond=999999)


def get_org_plan_limits(db: Session, organization_id: str) -> tuple[int, int]:
    """Returns (ai_calls_per_month, reports_per_month). Defaults to trial-like limits if missing."""
    sub = (
        db.query(OrgSubscription)
        .filter(OrgSubscription.organization_id == organization_id)
        .first()
    )
    if not sub:
        return (3, 0)
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == sub.plan_id).first()
    if not plan:
        return (3, 0)
    return (plan.ai_calls_per_month, plan.reports_per_month)


def count_ai_usage_this_month(db: Session, organization_id: str) -> int:
    start = _month_start_utc()
    q = (
        db.query(func.count(AiUsageEvent.id))
        .filter(
            AiUsageEvent.organization_id == organization_id,
            AiUsageEvent.created_at >= start,
        )
        .scalar()
    )
    return int(q or 0)


def count_report_usage_this_month(db: Session, organization_id: str) -> int:
    from app.models.generated_report import GeneratedReport

    start = _month_start_utc()
    q = (
        db.query(func.count(GeneratedReport.id))
        .filter(
            GeneratedReport.organization_id == organization_id,
            GeneratedReport.created_at >= start,
        )
        .scalar()
    )
    return int(q or 0)


def assert_ai_quota(db: Session, organization_id: str) -> None:
    limit, _ = get_org_plan_limits(db, organization_id)
    used = count_ai_usage_this_month(db, organization_id)
    if used >= limit:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"AI quota exceeded for this billing period ({used}/{limit}). Upgrade your plan.",
        )


def assert_report_quota(db: Session, organization_id: str) -> None:
    _, limit = get_org_plan_limits(db, organization_id)
    if limit <= 0:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Report generation is not included in your current plan.",
        )
    used = count_report_usage_this_month(db, organization_id)
    if used >= limit:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Report quota exceeded ({used}/{limit} this month).",
        )


def record_ai_usage(
    db: Session,
    *,
    organization_id: str,
    user_id: str | None,
    event_type: str,
) -> None:
    db.add(
        AiUsageEvent(
            organization_id=organization_id,
            user_id=user_id,
            event_type=event_type,
        )
    )
    db.commit()
