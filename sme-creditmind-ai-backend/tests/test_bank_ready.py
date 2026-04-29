from fastapi.testclient import TestClient

from app.bootstrap import ensure_subscription_plans
from app.core.security import hash_password
from app.database import SessionLocal, create_tables
from app.main import app
from app.models.membership import Membership
from app.models.merchant import Merchant
from app.models.organization import Organization
from app.models.subscription import OrgSubscription
from app.models.loan_case import LoanCase
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User


def setup_module() -> None:
    create_tables()
    db = SessionLocal()
    try:
        ensure_subscription_plans(db)
        db.query(LoanCase).delete()
        db.query(PasswordResetToken).delete()
        db.query(Membership).delete()
        db.query(Merchant).delete()
        db.query(OrgSubscription).delete()
        db.query(User).delete()
        db.query(Organization).delete()
        db.commit()

        o1 = Organization(id="org-a", name="Bank A", slug="bank-a")
        o2 = Organization(id="org-b", name="Bank B", slug="bank-b")
        db.add_all([o1, o2])
        u = User(
            id="u1",
            email="u1@example.com",
            hashed_password=hash_password("password12345"),
            full_name="User One",
        )
        db.add(u)
        db.add(Membership(user_id="u1", organization_id="org-a", role="ORG_ADMIN"))
        db.add(Membership(user_id="u1", organization_id="org-b", role="VIEWER"))
        db.add(OrgSubscription(organization_id="org-a", plan_id="plan-pro"))
        db.add(OrgSubscription(organization_id="org-b", plan_id="plan-pro"))
        db.add(
            Merchant(
                id="m-a1",
                organization_id="org-a",
                name="Merchant A1",
                category="Retail",
                city="HCMC",
                pos_provider="VNPay",
                status="ACTIVE",
                months_active=1,
            )
        )
        db.add(
            Merchant(
                id="m-b1",
                organization_id="org-b",
                name="Merchant B1",
                category="Retail",
                city="HCMC",
                pos_provider="VNPay",
                status="ACTIVE",
                months_active=1,
            )
        )
        db.commit()
    finally:
        db.close()


client = TestClient(app)


def test_login_and_tenant_isolation() -> None:
    r = client.post("/api/auth/login", json={"email": "u1@example.com", "password": "password12345"})
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]

    h = {"Authorization": f"Bearer {token}", "X-Organization-Id": "org-a"}
    m = client.get("/api/merchants", headers=h)
    assert m.status_code == 200
    ids = [x["id"] for x in m.json()["merchants"]]
    assert "m-a1" in ids
    assert "m-b1" not in ids

    h2 = {"Authorization": f"Bearer {token}", "X-Organization-Id": "org-b"}
    m2 = client.get("/api/merchants", headers=h2)
    ids2 = [x["id"] for x in m2.json()["merchants"]]
    assert "m-b1" in ids2
    assert "m-a1" not in ids2


def test_health_public() -> None:
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] in ("ok", "degraded")
