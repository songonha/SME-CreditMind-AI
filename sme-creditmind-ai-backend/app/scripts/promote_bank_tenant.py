"""
Nâng một user lên tenant kiểu "ngân hàng" để trải nghiệm đủ quota: gói enterprise,
đảm bảo ORG_ADMIN. Không sửa luồng /api/auth/register — chỉ chỉnh DB cho đúng email/org.

Chạy từ thư mục sme-creditmind-ai-backend (cùng .env / creditmind.db với API):

  python -m app.scripts.promote_bank_tenant --email you@example.com
  python -m app.scripts.promote_bank_tenant --email you@example.com --org-name "Ngân hàng ABC"
  python -m app.scripts.promote_bank_tenant --email you@example.com --org-id org-xxxxxxxxxxxx

  # Gói khác (mặc định plan-enterprise):
  python -m app.scripts.promote_bank_tenant --email you@example.com --plan-id plan-pro
"""

from __future__ import annotations

import argparse
import sys

from app.bootstrap import ensure_subscription_plans
from app.database import SessionLocal
from app.models.membership import Membership
from app.models.organization import Organization
from app.models.subscription import OrgSubscription
from app.models.user import User


def main() -> None:
    parser = argparse.ArgumentParser(description="Promote one org to bank-tier plan for demos.")
    parser.add_argument("--email", required=True, help="User email (lowercased when stored)")
    parser.add_argument(
        "--org-id",
        default=None,
        help="Organization id if the user belongs to more than one org",
    )
    parser.add_argument(
        "--org-name",
        default=None,
        help="Optional new display name for the organization (e.g. bank name)",
    )
    parser.add_argument(
        "--plan-id",
        default="plan-enterprise",
        help="Subscription plan id (default: plan-enterprise)",
    )
    args = parser.parse_args()

    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    email = args.email.strip().lower()
    db = SessionLocal()
    try:
        ensure_subscription_plans(db)

        from app.models.subscription import SubscriptionPlan

        plan_row = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == args.plan_id).first()
        if not plan_row:
            print(f"Unknown plan_id: {args.plan_id}. Run API once so plans are seeded.", file=sys.stderr)
            sys.exit(1)

        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"No user with email: {email}", file=sys.stderr)
            sys.exit(1)

        memberships = db.query(Membership).filter(Membership.user_id == user.id).all()
        if not memberships:
            print(f"User {email} has no organization membership.", file=sys.stderr)
            sys.exit(1)

        if args.org_id:
            m = next((x for x in memberships if x.organization_id == args.org_id), None)
            if not m:
                print(f"No membership for org_id={args.org_id}.", file=sys.stderr)
                sys.exit(1)
            chosen = m
        elif len(memberships) > 1:
            ids = [x.organization_id for x in memberships]
            print(
                f"User belongs to {len(memberships)} orgs. Pass --org-id with one of:\n  "
                + "\n  ".join(ids),
                file=sys.stderr,
            )
            sys.exit(1)
        else:
            chosen = memberships[0]

        if chosen.role != "ORG_ADMIN":
            chosen.role = "ORG_ADMIN"

        org = db.query(Organization).filter(Organization.id == chosen.organization_id).first()
        if not org:
            print("Organization row missing.", file=sys.stderr)
            sys.exit(1)

        if args.org_name:
            org.name = args.org_name.strip()

        sub = (
            db.query(OrgSubscription)
            .filter(OrgSubscription.organization_id == org.id)
            .first()
        )
        if sub:
            sub.plan_id = args.plan_id
        else:
            db.add(OrgSubscription(organization_id=org.id, plan_id=args.plan_id))

        db.commit()

        lim_ai = plan_row.ai_calls_per_month
        lim_rep = plan_row.reports_per_month
        print("Done.")
        print(f"  user:    {email} (ORG_ADMIN)")
        print(f"  org:     {org.id} — {org.name} ({org.slug})")
        print(f"  plan:    {args.plan_id} — AI/mo: {lim_ai}, reports/mo: {lim_rep}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
