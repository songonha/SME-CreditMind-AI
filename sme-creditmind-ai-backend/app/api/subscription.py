from __future__ import annotations

from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps.auth import OrgContext, get_current_user, get_org_context, require_roles
from app.models.subscription import OrgSubscription, SubscriptionPlan
from app.models.user import User
from app.services.entitlements import (
    count_ai_usage_this_month,
    count_report_usage_this_month,
    get_org_plan_limits,
)

router = APIRouter(prefix="/api/subscription", tags=["subscription"])

PLAN_ORDER = ("trial", "basic", "pro", "enterprise")


class PlanOut(BaseModel):
    id: str
    name: str
    code: str
    aiCallsPerMonth: int
    reportsPerMonth: int


class CurrentSubscriptionResponse(BaseModel):
    planId: str
    planName: str
    planCode: str
    aiLimitPerMonth: int
    reportsLimitPerMonth: int
    aiUsedThisMonth: int
    reportsUsedThisMonth: int


class ChangePlanBody(BaseModel):
    planId: str


def _plan_sort_key(code: str) -> int:
    try:
        return PLAN_ORDER.index(code)
    except ValueError:
        return len(PLAN_ORDER)


@router.get("/plans", response_model=List[PlanOut])
def list_plans(
    _user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    rows = db.query(SubscriptionPlan).all()
    rows.sort(key=lambda p: (_plan_sort_key(p.code), p.ai_calls_per_month))
    return [
        PlanOut(
            id=p.id,
            name=p.name,
            code=p.code,
            aiCallsPerMonth=p.ai_calls_per_month,
            reportsPerMonth=p.reports_per_month,
        )
        for p in rows
    ]


def _current_payload(ctx: OrgContext, db: Session) -> CurrentSubscriptionResponse:
    ai_lim, rep_lim = get_org_plan_limits(db, ctx.organization_id)
    sub = (
        db.query(OrgSubscription)
        .filter(OrgSubscription.organization_id == ctx.organization_id)
        .first()
    )
    plan_id = sub.plan_id if sub else "plan-trial"
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id).first()
    if not plan:
        plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.code == "trial").first()
        if plan:
            plan_id = plan.id
    if not plan:
        raise HTTPException(status_code=500, detail="Subscription plans not seeded")

    return CurrentSubscriptionResponse(
        planId=plan_id,
        planName=plan.name,
        planCode=plan.code,
        aiLimitPerMonth=ai_lim,
        reportsLimitPerMonth=rep_lim,
        aiUsedThisMonth=count_ai_usage_this_month(db, ctx.organization_id),
        reportsUsedThisMonth=count_report_usage_this_month(db, ctx.organization_id),
    )


@router.get("/current", response_model=CurrentSubscriptionResponse)
def get_current_subscription(
    ctx: Annotated[OrgContext, Depends(get_org_context)],
    db: Session = Depends(get_db),
):
    return _current_payload(ctx, db)


@router.patch("/plan", response_model=CurrentSubscriptionResponse)
def change_plan(
    body: ChangePlanBody,
    ctx: Annotated[OrgContext, Depends(require_roles("ORG_ADMIN"))],
    db: Session = Depends(get_db),
):
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == body.planId.strip()).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown planId")

    sub = (
        db.query(OrgSubscription)
        .filter(OrgSubscription.organization_id == ctx.organization_id)
        .first()
    )
    if sub:
        sub.plan_id = plan.id
    else:
        db.add(OrgSubscription(organization_id=ctx.organization_id, plan_id=plan.id))
    db.commit()
    return _current_payload(ctx, db)
