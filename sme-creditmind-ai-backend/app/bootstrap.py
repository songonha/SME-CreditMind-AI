"""Idempotent seed data for subscription plans and defaults."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.membership import Membership
from app.models.organization import Organization
from app.models.subscription import OrgSubscription, SubscriptionPlan
from app.models.user import User

# Single source of truth for demo login (also used by `app/seed.py` full reset).
DEMO_ORGANIZATION_ID = "org-demo"
DEMO_ADMIN_EMAIL = "admin@demo.creditmind.example.com"
DEMO_ADMIN_PASSWORD = "DemoBank!2026"


def ensure_subscription_plans(db: Session) -> None:
    defaults = [
        ("plan-trial", "Trial", "trial", 10, 1),
        ("plan-basic", "Basic", "basic", 50, 5),
        ("plan-pro", "Pro", "pro", 500, 50),
        ("plan-enterprise", "Enterprise", "enterprise", 999_999, 999_999),
    ]
    for pid, name, code, ai_lim, rep_lim in defaults:
        if db.query(SubscriptionPlan).filter(SubscriptionPlan.id == pid).first():
            continue
        db.add(
            SubscriptionPlan(
                id=pid,
                name=name,
                code=code,
                ai_calls_per_month=ai_lim,
                reports_per_month=rep_lim,
            )
        )
    db.commit()


def ensure_demo_tenant(db: Session) -> None:
    """Create demo org + admin user if missing (no table drops). Safe on every startup."""
    if db.get(Organization, DEMO_ORGANIZATION_ID) is None:
        db.add(
            Organization(
                id=DEMO_ORGANIZATION_ID,
                name="Demo Bank (seed)",
                slug="demo-bank",
            )
        )

    email = DEMO_ADMIN_EMAIL.lower()
    if db.query(User).filter(User.email == email).first() is None:
        db.add(
            User(
                id="usr-demo-admin",
                email=email,
                hashed_password=hash_password(DEMO_ADMIN_PASSWORD),
                full_name="Demo Loan Officer",
            )
        )

    db.flush()

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        db.rollback()
        return

    if (
        db.query(Membership)
        .filter(
            Membership.user_id == user.id,
            Membership.organization_id == DEMO_ORGANIZATION_ID,
        )
        .first()
        is None
    ):
        db.add(
            Membership(
                user_id=user.id,
                organization_id=DEMO_ORGANIZATION_ID,
                role="ORG_ADMIN",
            )
        )

    if (
        db.query(OrgSubscription)
        .filter(OrgSubscription.organization_id == DEMO_ORGANIZATION_ID)
        .first()
        is None
    ):
        db.add(
            OrgSubscription(
                organization_id=DEMO_ORGANIZATION_ID,
                plan_id="plan-enterprise",
            )
        )

    db.commit()
