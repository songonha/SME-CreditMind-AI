"""
Seed the database with realistic SME merchants (including one [DEMO LUONG] workflow SME)
and their POS transaction data.

Each merchant has a distinct business profile that produces different credit scores
when run through the scoring engine (from excellent to poor).
"""

from __future__ import annotations

import random
import uuid
from datetime import datetime, timedelta

from sqlalchemy.exc import OperationalError as SAOperationalError

from app.bootstrap import (
    DEMO_ADMIN_EMAIL,
    DEMO_ADMIN_PASSWORD,
    DEMO_ORGANIZATION_ID as ORG_DEMO_ID,
    ensure_subscription_plans,
)
from app.core.security import hash_password
from app.database import SessionLocal, create_tables, engine, Base
from app.models.credit_score import CreditScore
from app.models.alert import Alert
from app.models.membership import Membership
from app.models.merchant import Merchant
from app.models.organization import Organization
from app.models.subscription import OrgSubscription
from app.models.transaction import Transaction
from app.models.user import User
from app.services.scoring_engine import run_assessment

# Id cố định để gắn ?merchantId= trong UI và thử quy trình (upload / assess / merchant detail).
WORKFLOW_DEMO_MERCHANT_ID = "m-demo-workflow"

random.seed(42)

MERCHANTS = [
    {
        "id": "m-001",
        "name": "Pho Ha Noi - 123 Nguyen Hue",
        "category": "F&B / Restaurant",
        "sub_category": "Vietnamese Cuisine",
        "address": "123 Nguyen Hue, Phuong Ben Nghe",
        "district": "Quan 1",
        "city": "Ho Chi Minh City",
        "pos_provider": "VNPay",
        "contact_name": "Nguyen Van An",
        "contact_phone": "0901234567",
        "contact_email": "an@phonoihanoi.vn",
        "months_active": 18,
        "profile": "excellent",
    },
    {
        "id": "m-002",
        "name": "TechShop Saigon",
        "category": "Retail / Electronics",
        "sub_category": "Consumer Electronics",
        "address": "456 Le Loi, Phuong Ben Thanh",
        "district": "Quan 1",
        "city": "Ho Chi Minh City",
        "pos_provider": "Momo",
        "contact_name": "Tran Thi Bich",
        "contact_phone": "0912345678",
        "contact_email": "bich@techshopsaigon.vn",
        "months_active": 8,
        "profile": "medium",
    },
    {
        "id": "m-003",
        "name": "Cafe Saigon Roasters",
        "category": "F&B / Cafe",
        "sub_category": "Specialty Coffee",
        "address": "78 Hai Ba Trung, Phuong Da Kao",
        "district": "Quan 1",
        "city": "Ho Chi Minh City",
        "pos_provider": "ZaloPay",
        "contact_name": "Le Minh Duc",
        "contact_phone": "0923456789",
        "contact_email": "duc@saigonroasters.vn",
        "months_active": 4,
        "profile": "poor",
    },
    {
        "id": "m-004",
        "name": "Banh Mi Express Q7",
        "category": "F&B / Quick Service",
        "sub_category": "Street Food",
        "address": "22 Nguyen Thi Thap, Tan Phong",
        "district": "Quan 7",
        "city": "Ho Chi Minh City",
        "pos_provider": "VNPay",
        "contact_name": "Pham Hoang Long",
        "contact_phone": "0934567890",
        "contact_email": "long@banhmiq7.vn",
        "months_active": 14,
        "profile": "good",
    },
    {
        "id": "m-005",
        "name": "Beauty Corner Spa",
        "category": "Services / Beauty",
        "sub_category": "Spa & Wellness",
        "address": "55 Phan Xich Long, Phuong 2",
        "district": "Phu Nhuan",
        "city": "Ho Chi Minh City",
        "pos_provider": "Momo",
        "contact_name": "Vo Thi Mai",
        "contact_phone": "0945678901",
        "contact_email": "mai@beautycorner.vn",
        "months_active": 11,
        "profile": "good",
    },
    {
        "id": "m-006",
        "name": "MiniMart Binh Thanh",
        "category": "Retail / Convenience",
        "sub_category": "Mini Supermarket",
        "address": "101 Xo Viet Nghe Tinh, Phuong 21",
        "district": "Binh Thanh",
        "city": "Ho Chi Minh City",
        "pos_provider": "VNPay",
        "contact_name": "Hoang Duc Tai",
        "contact_phone": "0956789012",
        "contact_email": "tai@minimart-bt.vn",
        "months_active": 22,
        "profile": "excellent",
    },
    {
        "id": "m-007",
        "name": "Fashion House Thu Duc",
        "category": "Retail / Fashion",
        "sub_category": "Clothing & Accessories",
        "address": "200 Vo Van Ngan, Linh Chieu",
        "district": "Thu Duc",
        "city": "Ho Chi Minh City",
        "pos_provider": "ZaloPay",
        "contact_name": "Dang Phuong Thao",
        "contact_phone": "0967890123",
        "contact_email": "thao@fashionhouse.vn",
        "months_active": 6,
        "profile": "below_average",
    },
    {
        "id": "m-008",
        "name": "Gym Fit Pro",
        "category": "Services / Fitness",
        "sub_category": "Gym & Training",
        "address": "88 Nguyen Van Linh, Tan Phong",
        "district": "Quan 7",
        "city": "Ho Chi Minh City",
        "pos_provider": "Momo",
        "contact_name": "Bui Thanh Son",
        "contact_phone": "0978901234",
        "contact_email": "son@gymfitpro.vn",
        "months_active": 16,
        "profile": "good",
    },
    {
        "id": WORKFLOW_DEMO_MERCHANT_ID,
        "name": "[DEMO LUONG] Cafe Thu Nghiem Quy Trinh",
        "category": "F&B / Cafe",
        "sub_category": "Coffee Shop",
        "address": "10 Ly Tu Trong, Phuong Ben Nghe",
        "district": "Quan 1",
        "city": "Ho Chi Minh City",
        "pos_provider": "VNPay",
        "contact_name": "Tran Thu Nghiem",
        "contact_phone": "0987654321",
        "contact_email": "demo.workflow@creditmind.local",
        "months_active": 10,
        "profile": "good",
    },
]

PROFILES = {
    "excellent": {
        "base_daily_txns": (75, 95),
        "base_ticket": (90_000, 140_000),
        "digital_ratio": (0.68, 0.80),
        "active_day_pct": (0.95, 1.0),
        "customer_pool": (600, 1200),
        "growth_monthly": 0.015,
        "volatility": 0.08,
    },
    "good": {
        "base_daily_txns": (45, 70),
        "base_ticket": (80_000, 150_000),
        "digital_ratio": (0.55, 0.72),
        "active_day_pct": (0.88, 0.96),
        "customer_pool": (350, 800),
        "growth_monthly": 0.008,
        "volatility": 0.12,
    },
    "medium": {
        "base_daily_txns": (35, 55),
        "base_ticket": (130_000, 180_000),
        "digital_ratio": (0.58, 0.68),
        "active_day_pct": (0.82, 0.90),
        "customer_pool": (250, 550),
        "growth_monthly": 0.002,
        "volatility": 0.22,
    },
    "below_average": {
        "base_daily_txns": (18, 35),
        "base_ticket": (180_000, 350_000),
        "digital_ratio": (0.35, 0.52),
        "active_day_pct": (0.75, 0.85),
        "customer_pool": (150, 350),
        "growth_monthly": -0.005,
        "volatility": 0.30,
    },
    "poor": {
        "base_daily_txns": (15, 30),
        "base_ticket": (100_000, 180_000),
        "digital_ratio": (0.38, 0.55),
        "active_day_pct": (0.65, 0.78),
        "customer_pool": (100, 300),
        "growth_monthly": -0.06,
        "volatility": 0.35,
    },
}

PAYMENT_METHODS_DIGITAL = ["CARD", "EWALLET", "QR_CODE"]
PAYMENT_METHODS_CASH = ["CASH", "BANK_TRANSFER"]

NOW = datetime(2026, 4, 10, 12, 0, 0)


def _generate_transactions(merchant_id: str, months_active: int, profile_name: str) -> list[Transaction]:
    """Generate realistic daily transactions for a merchant."""
    profile = PROFILES[profile_name]
    transactions: list[Transaction] = []

    start_date = NOW - timedelta(days=months_active * 30)

    daily_txns_base = random.randint(*profile["base_daily_txns"])
    ticket_lo, ticket_hi = profile["base_ticket"]
    digital_lo, digital_hi = profile["digital_ratio"]
    active_lo, active_hi = profile["active_day_pct"]
    cust_lo, cust_hi = profile["customer_pool"]
    growth = profile["growth_monthly"]
    vol = profile["volatility"]

    customer_pool = [f"cust-{uuid.uuid4().hex[:8]}" for _ in range(random.randint(cust_lo, cust_hi))]

    current_date = start_date
    month_idx = 0

    while current_date <= NOW:
        month_start = current_date.replace(day=1)
        month_growth_factor = 1.0 + (growth * month_idx)
        month_noise = random.gauss(1.0, vol * 0.3)
        month_factor = max(0.3, month_growth_factor * month_noise)

        is_active = random.random() < random.uniform(active_lo, active_hi)
        if not is_active:
            current_date += timedelta(days=1)
            if current_date.day == 1:
                month_idx += 1
            continue

        day_txn_count = max(1, int(daily_txns_base * month_factor * random.gauss(1.0, 0.15)))
        digital_ratio = random.uniform(digital_lo, digital_hi)

        for _ in range(day_txn_count):
            is_digital = random.random() < digital_ratio
            if is_digital:
                method = random.choice(PAYMENT_METHODS_DIGITAL)
            else:
                method = random.choice(PAYMENT_METHODS_CASH)

            amount = max(10_000, int(random.gauss(
                (ticket_lo + ticket_hi) / 2 * month_factor,
                (ticket_hi - ticket_lo) / 3
            )))
            amount = round(amount, -3)

            hour = random.randint(7, 22)
            minute = random.randint(0, 59)
            txn_time = current_date.replace(hour=hour, minute=minute, second=random.randint(0, 59))

            customer = random.choice(customer_pool)

            txn = Transaction(
                id=f"txn-{uuid.uuid4().hex[:12]}",
                merchant_id=merchant_id,
                amount=float(amount),
                currency="VND",
                payment_method=method,
                terminal_id=f"T{random.randint(1, 3):02d}",
                customer_id=customer,
                transaction_at=txn_time,
            )
            transactions.append(txn)

        next_date = current_date + timedelta(days=1)
        if next_date.month != current_date.month:
            month_idx += 1
        current_date = next_date

    return transactions


def _create_alerts(db_session) -> None:
    """Create alerts based on actual assessment results."""
    from app.models.credit_score import CreditScore as CS
    from sqlalchemy import desc

    merchants_db = db_session.query(Merchant).all()
    alerts = []

    for m in merchants_db:
        score = (
            db_session.query(CS)
            .filter(CS.merchant_id == m.id)
            .order_by(desc(CS.created_at))
            .first()
        )
        if not score:
            continue

        if score.score < 400:
            alerts.append(Alert(
                id=f"a-{uuid.uuid4().hex[:8]}",
                merchant_id=m.id,
                type="score_drop",
                message=f"Credit score is {score.score} (Grade {score.grade}). Revenue declining trend detected. Immediate review recommended.",
                severity="high",
                created_at=NOW - timedelta(hours=random.randint(1, 48)),
            ))
        elif score.score < 550:
            alerts.append(Alert(
                id=f"a-{uuid.uuid4().hex[:8]}",
                merchant_id=m.id,
                type="anomaly",
                message=f"Score is {score.score} (Grade {score.grade}). Some operational inconsistencies noted in recent transaction patterns.",
                severity="medium",
                created_at=NOW - timedelta(hours=random.randint(12, 96)),
            ))

        if score.recommendation == "APPROVE" and score.score > 750:
            alerts.append(Alert(
                id=f"a-{uuid.uuid4().hex[:8]}",
                merchant_id=m.id,
                type="new_assessment",
                message=f"New assessment completed. Score: {score.score} (Grade {score.grade}). Pre-approved limit: {score.pre_approved_limit/1e6:.0f}M VND.",
                severity="low",
                created_at=score.created_at,
            ))

    for alert in alerts:
        db_session.add(alert)
    db_session.commit()


def _print_workflow_demo_hints() -> None:
    mid = WORKFLOW_DEMO_MERCHANT_ID
    print("\n--- Workflow demo SME ---")
    print(f"  Search name:       [DEMO LUONG]  (id: {mid})")
    print(f"  Merchant detail:   /merchants/{mid}")
    print(f"  POS file upload:   /transaction-upload?merchantId={mid}")
    print(f"  New Assessment:    /assess?merchantId={mid}")
    print(f"  Sample CSV (extra): sme-creditmind-ai-backend/samples/workflow-demo-upload.csv\n")


def ensure_workflow_demo_merchant() -> None:
    """
    Them SME [DEMO LUONG] + giao dich + cham diem vao DB hien tai (KHONG xoa bang).
    Can to chuc org-demo (chay `python app/seed.py` mot lan truoc day tren may ban).
    """
    db = SessionLocal()
    try:
        try:
            existing = db.get(Merchant, WORKFLOW_DEMO_MERCHANT_ID)
        except SAOperationalError:
            print(
                "ERROR: SQLite schema does not match this backend (missing column/table).\n"
                "  Run full reset seed:\n"
                "    cd sme-creditmind-ai-backend\n"
                "    .venv\\Scripts\\python.exe app\\seed.py"
            )
            return

        if existing:
            print(f"[OK] Merchant '{WORKFLOW_DEMO_MERCHANT_ID}' already exists (skipped).")
            _print_workflow_demo_hints()
            return

        org = db.get(Organization, ORG_DEMO_ID)
        if not org:
            print(
                "ERROR: org-demo not found. Run full seed first:\n"
                "  cd sme-creditmind-ai-backend && .venv\\Scripts\\python.exe app\\seed.py"
            )
            return

        tmpl = next((m for m in MERCHANTS if m["id"] == WORKFLOW_DEMO_MERCHANT_ID), None)
        if not tmpl:
            print("ERROR: MERCHANTS list missing WORKFLOW_DEMO_MERCHANT_ID entry.")
            return

        profile = tmpl["profile"]
        mdata = {k: v for k, v in tmpl.items() if k != "profile"}
        merchant = Merchant(
            organization_id=ORG_DEMO_ID,
            status="ACTIVE",
            created_at=NOW - timedelta(days=mdata["months_active"] * 30),
            updated_at=NOW,
            **mdata,
        )
        db.add(merchant)
        db.commit()

        print(f"  [{merchant.id}] {merchant.name} — generating transactions ({profile})...")
        txns = _generate_transactions(merchant.id, merchant.months_active, profile)
        batch_size = 5000
        for i in range(0, len(txns), batch_size):
            batch = txns[i : i + batch_size]
            db.bulk_save_objects(batch)
            db.commit()
        print(f"    -> {len(txns)} transactions created")

        print("    -> Running credit assessment...")
        score = run_assessment(db, merchant.id)
        print(f"    -> Score: {score.score} | Grade: {score.grade} | Recommendation: {score.recommendation}")

        _create_alerts(db)
        print("\n[OK] Workflow demo merchant added. Next steps:")
        _print_workflow_demo_hints()
    finally:
        db.close()


def seed():
    print("=" * 72)
    print("WARNING: Full seed DROPS ALL TABLES — every user/account you created will be deleted.")
    print("         For day-to-day work, rely on the demo admin created on backend startup instead.")
    print("         Only run this when you need fresh merchant/transaction sample data.")
    print("=" * 72)
    print("Dropping existing tables...")
    Base.metadata.drop_all(bind=engine)

    print("Creating tables...")
    create_tables()

    db = SessionLocal()
    try:
        ensure_subscription_plans(db)

        org = Organization(
            id=ORG_DEMO_ID,
            name="Demo Bank (seed)",
            slug="demo-bank",
        )
        db.add(org)
        demo_user = User(
            id="usr-demo-admin",
            email=DEMO_ADMIN_EMAIL,
            hashed_password=hash_password(DEMO_ADMIN_PASSWORD),
            full_name="Demo Loan Officer",
        )
        db.add(demo_user)
        db.add(
            Membership(
                user_id=demo_user.id,
                organization_id=ORG_DEMO_ID,
                role="ORG_ADMIN",
            )
        )
        db.add(
            OrgSubscription(
                organization_id=ORG_DEMO_ID,
                plan_id="plan-enterprise",
            )
        )
        db.commit()

        print(f"Demo login: {DEMO_ADMIN_EMAIL} / {DEMO_ADMIN_PASSWORD}")
        print(f"Use header X-Organization-Id: {ORG_DEMO_ID}")
        print(f"Seeding {len(MERCHANTS)} merchants with realistic transaction data...")

        for tmpl in MERCHANTS:
            profile = tmpl["profile"]
            mdata = {k: v for k, v in tmpl.items() if k != "profile"}
            merchant = Merchant(
                organization_id=ORG_DEMO_ID,
                status="ACTIVE",
                created_at=NOW - timedelta(days=mdata["months_active"] * 30),
                updated_at=NOW,
                **mdata,
            )
            db.add(merchant)
            db.commit()

            print(f"  [{merchant.id}] {merchant.name} — generating {merchant.months_active} months of transactions ({profile})...")

            txns = _generate_transactions(merchant.id, merchant.months_active, profile)
            batch_size = 5000
            for i in range(0, len(txns), batch_size):
                batch = txns[i:i + batch_size]
                db.bulk_save_objects(batch)
                db.commit()
            print(f"    -> {len(txns)} transactions created")

            print(f"    -> Running credit assessment...")
            score = run_assessment(db, merchant.id)
            print(f"    -> Score: {score.score} | Grade: {score.grade} | Recommendation: {score.recommendation}")

        print("\nCreating alerts...")
        _create_alerts(db)

        total_txns = db.query(Transaction).count()
        total_scores = db.query(CreditScore).count()
        total_alerts = db.query(Alert).count()

        print(f"\nSeed complete!")
        print(f"  Merchants:    {len(MERCHANTS)}")
        print(f"  Transactions: {total_txns:,}")
        print(f"  Assessments:  {total_scores}")
        print(f"  Alerts:       {total_alerts}")
        _print_workflow_demo_hints()

    finally:
        db.close()


if __name__ == "__main__":
    seed()
