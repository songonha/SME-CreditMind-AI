"""Password reset and change-password flows."""

from __future__ import annotations

import hashlib
from datetime import datetime, timedelta

from fastapi.testclient import TestClient

from app.bootstrap import ensure_subscription_plans
from app.core.security import hash_password, verify_password
from app.database import SessionLocal, create_tables
from app.main import app
from app.models.membership import Membership
from app.models.merchant import Merchant
from app.models.organization import Organization
from app.models.password_reset_token import PasswordResetToken
from app.models.subscription import OrgSubscription
from app.models.user import User


def _token_hash(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def setup_module() -> None:
    create_tables()
    db = SessionLocal()
    try:
        ensure_subscription_plans(db)
        db.query(PasswordResetToken).delete()
        db.query(Membership).delete()
        db.query(Merchant).delete()
        db.query(OrgSubscription).delete()
        db.query(User).delete()
        db.query(Organization).delete()
        db.commit()

        o = Organization(id="org-pr", name="Bank PR", slug="bank-pr")
        db.add(o)
        u = User(
            id="u-pr",
            email="resetuser@example.com",
            hashed_password=hash_password("OriginalPass9"),
            full_name="Reset User",
        )
        db.add(u)
        db.add(Membership(user_id="u-pr", organization_id="org-pr", role="ORG_ADMIN"))
        db.add(OrgSubscription(organization_id="org-pr", plan_id="plan-pro"))
        db.commit()
    finally:
        db.close()


client = TestClient(app)


def test_forgot_password_same_message_unknown_email() -> None:
    r1 = client.post("/api/auth/forgot-password", json={"email": "nobody@example.com"})
    r2 = client.post("/api/auth/forgot-password", json={"email": "resetuser@example.com"})
    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r1.json()["message"] == r2.json()["message"]


def test_reset_password_then_login() -> None:
    raw = "unit-test-reset-token-xyz"
    db = SessionLocal()
    try:
        db.query(PasswordResetToken).filter(PasswordResetToken.user_id == "u-pr").delete()
        db.add(
            PasswordResetToken(
                id="prt-test-1",
                user_id="u-pr",
                token_hash=_token_hash(raw),
                expires_at=datetime.utcnow() + timedelta(hours=1),
            )
        )
        db.commit()
    finally:
        db.close()

    r = client.post(
        "/api/auth/reset-password",
        json={"token": raw, "new_password": "NewSecurePass9"},
    )
    assert r.status_code == 200, r.text

    bad_login = client.post(
        "/api/auth/login",
        json={"email": "resetuser@example.com", "password": "OriginalPass9"},
    )
    assert bad_login.status_code == 401

    good = client.post(
        "/api/auth/login",
        json={"email": "resetuser@example.com", "password": "NewSecurePass9"},
    )
    assert good.status_code == 200


def test_reset_token_single_use() -> None:
    raw = "second-use-token"
    db = SessionLocal()
    try:
        u = db.query(User).filter(User.id == "u-pr").first()
        assert u is not None
        u.hashed_password = hash_password("FreshPass9")
        db.query(PasswordResetToken).filter(PasswordResetToken.user_id == "u-pr").delete()
        db.add(
            PasswordResetToken(
                id="prt-test-2",
                user_id="u-pr",
                token_hash=_token_hash(raw),
                expires_at=datetime.utcnow() + timedelta(hours=1),
            )
        )
        db.commit()
    finally:
        db.close()

    r1 = client.post(
        "/api/auth/reset-password",
        json={"token": raw, "new_password": "AnotherPass9"},
    )
    assert r1.status_code == 200
    r2 = client.post(
        "/api/auth/reset-password",
        json={"token": raw, "new_password": "AnotherPass99"},
    )
    assert r2.status_code == 400


def test_change_password_authenticated() -> None:
    login = client.post(
        "/api/auth/login",
        json={"email": "resetuser@example.com", "password": "AnotherPass9"},
    )
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    h = {"Authorization": f"Bearer {token}"}

    ch = client.post(
        "/api/auth/change-password",
        headers=h,
        json={"current_password": "AnotherPass9", "new_password": "ChangedPass10"},
    )
    assert ch.status_code == 200, ch.text

    bad = client.post(
        "/api/auth/login",
        json={"email": "resetuser@example.com", "password": "AnotherPass9"},
    )
    assert bad.status_code == 401

    ok = client.post(
        "/api/auth/login",
        json={"email": "resetuser@example.com", "password": "ChangedPass10"},
    )
    assert ok.status_code == 200

    db = SessionLocal()
    try:
        u = db.query(User).filter(User.email == "resetuser@example.com").first()
        assert u is not None
        assert verify_password("ChangedPass10", u.hashed_password)
    finally:
        db.close()
