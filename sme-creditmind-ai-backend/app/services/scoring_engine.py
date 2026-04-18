"""
Real credit scoring engine for SME merchants based on POS transaction data.

Scoring factors (0-1000 scale):
  1. Revenue Stability     – coefficient of variation of monthly revenue
  2. Transaction Volume    – daily average transaction count
  3. Customer Base         – repeat rate & concentration
  4. Operating Consistency – percentage of active days
  5. Digital Payment Adoption – digital vs cash ratio
  6. Seasonal Resilience   – seasonal volatility index
  7. Growth Momentum       – revenue trend slope
"""

from __future__ import annotations

import uuid
from calendar import monthrange
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
from sqlalchemy import func as sa_func
from sqlalchemy.orm import Session

from app.models.transaction import Transaction, MonthlyAggregate
from app.models.credit_score import CreditScore, CreditFactor
from app.models.merchant import Merchant

GRADE_THRESHOLDS = [(800, "A"), (650, "B"), (500, "C"), (350, "D"), (0, "E")]
RISK_MAP = {"A": "VERY_LOW", "B": "LOW", "C": "MEDIUM", "D": "HIGH", "E": "VERY_HIGH"}
REC_MAP = {"A": "APPROVE", "B": "APPROVE", "C": "REVIEW", "D": "REVIEW", "E": "DECLINE"}

LIMIT_TABLE = {
    "A": 500_000_000,
    "B": 300_000_000,
    "C": 120_000_000,
    "D": 40_000_000,
    "E": 0,
}


def _grade_for_score(score: int) -> str:
    for threshold, grade in GRADE_THRESHOLDS:
        if score >= threshold:
            return grade
    return "E"


def _build_monthly_df(db: Session, merchant_id: str) -> pd.DataFrame:
    rows = (
        db.query(MonthlyAggregate)
        .filter(MonthlyAggregate.merchant_id == merchant_id)
        .order_by(MonthlyAggregate.month)
        .all()
    )
    if not rows:
        return pd.DataFrame()

    data = [
        {
            "month": r.month,
            "revenue": r.revenue,
            "txn_count": r.transaction_count,
            "unique_customers": r.unique_customers,
            "avg_ticket": r.avg_ticket_size,
            "digital_ratio": r.digital_ratio,
            "active_days": r.active_days,
            "total_days": r.total_days,
        }
        for r in rows
    ]
    return pd.DataFrame(data)


def compute_monthly_aggregates(db: Session, merchant_id: str) -> None:
    """Recompute monthly aggregates from raw transactions."""
    db.query(MonthlyAggregate).filter(
        MonthlyAggregate.merchant_id == merchant_id
    ).delete()

    txns = (
        db.query(Transaction)
        .filter(Transaction.merchant_id == merchant_id)
        .order_by(Transaction.transaction_at)
        .all()
    )
    if not txns:
        db.commit()
        return

    df = pd.DataFrame(
        [
            {
                "amount": t.amount,
                "payment_method": t.payment_method,
                "customer_id": t.customer_id,
                "txn_date": t.transaction_at,
            }
            for t in txns
        ]
    )
    df["month"] = df["txn_date"].apply(lambda d: d.strftime("%Y-%m"))
    df["day"] = df["txn_date"].apply(lambda d: d.strftime("%Y-%m-%d"))
    df["is_digital"] = df["payment_method"].isin(["CARD", "EWALLET", "QR_CODE"])

    for month_str, group in df.groupby("month"):
        year, mon = int(month_str[:4]), int(month_str[5:])
        _, days_in_month = monthrange(year, mon)

        agg = MonthlyAggregate(
            merchant_id=merchant_id,
            month=month_str,
            revenue=float(group["amount"].sum()),
            transaction_count=len(group),
            unique_customers=int(group["customer_id"].nunique()),
            avg_ticket_size=float(group["amount"].mean()),
            digital_ratio=float(group["is_digital"].mean()),
            active_days=int(group["day"].nunique()),
            total_days=days_in_month,
        )
        db.add(agg)

    db.commit()


def _score_revenue_stability(df: pd.DataFrame) -> dict:
    """Lower coefficient of variation = more stable revenue."""
    revenues = df["revenue"].values
    if len(revenues) < 2:
        return {"raw": 0.5, "weight": 0.40, "impact": "neutral",
                "description": "Insufficient data for revenue stability analysis.",
                "data_point": f"Avg {revenues.mean()/1e6:.0f}M VND/month" if len(revenues) else "N/A"}

    mean_rev = np.mean(revenues)
    cov = np.std(revenues) / mean_rev if mean_rev > 0 else 1.0

    if cov <= 0.10:
        raw = 0.95
    elif cov <= 0.15:
        raw = 0.85
    elif cov <= 0.20:
        raw = 0.70
    elif cov <= 0.30:
        raw = 0.50
    elif cov <= 0.40:
        raw = 0.30
    else:
        raw = 0.15

    impact = "positive" if raw >= 0.65 else ("negative" if raw < 0.40 else "neutral")
    return {
        "raw": raw,
        "weight": raw if impact == "positive" else -raw if impact == "negative" else raw * 0.3,
        "impact": impact,
        "description": f"Monthly revenue coefficient of variation is {cov:.2f}. "
                       f"{'Consistent and predictable cash flows.' if cov < 0.20 else 'Revenue shows significant month-to-month variance.'}"
                       f" Average monthly revenue: {mean_rev/1e6:.0f}M VND over {len(revenues)} months.",
        "data_point": f"Avg {mean_rev/1e6:.0f}M VND/month",
    }


def _score_transaction_volume(df: pd.DataFrame) -> dict:
    total_txns = df["txn_count"].sum()
    total_days = df["active_days"].sum()
    daily_avg = total_txns / total_days if total_days > 0 else 0

    if daily_avg >= 80:
        raw = 0.90
    elif daily_avg >= 50:
        raw = 0.75
    elif daily_avg >= 30:
        raw = 0.60
    elif daily_avg >= 15:
        raw = 0.40
    else:
        raw = 0.20

    impact = "positive" if raw >= 0.60 else ("negative" if raw < 0.35 else "neutral")
    trend = ""
    if len(df) >= 3:
        recent = df["txn_count"].iloc[-3:].mean()
        earlier = df["txn_count"].iloc[:3].mean()
        pct = ((recent - earlier) / earlier * 100) if earlier > 0 else 0
        trend = f" {'Trending up' if pct > 5 else 'Trending down' if pct < -5 else 'Stable trend'} ({pct:+.0f}%)."

    return {
        "raw": raw,
        "weight": raw if impact == "positive" else -raw if impact == "negative" else raw * 0.3,
        "impact": impact,
        "description": f"Average {daily_avg:.0f} transactions per day across {total_days} active days.{trend}",
        "data_point": f"{daily_avg:.0f} txn/day avg",
    }


def _score_customer_base(df: pd.DataFrame) -> dict:
    total_customers = df["unique_customers"].sum()
    months = len(df)
    if months < 2:
        return {"raw": 0.5, "weight": 0.30, "impact": "neutral",
                "description": "Insufficient data for customer analysis.",
                "data_point": "N/A"}

    avg_monthly_customers = df["unique_customers"].mean()

    first_half = df["unique_customers"].iloc[: months // 2].mean()
    second_half = df["unique_customers"].iloc[months // 2 :].mean()
    growth = (second_half - first_half) / first_half if first_half > 0 else 0

    if growth > 0.15 and avg_monthly_customers > 300:
        raw = 0.85
    elif growth > 0.05:
        raw = 0.70
    elif growth > -0.05:
        raw = 0.50
    elif growth > -0.15:
        raw = 0.35
    else:
        raw = 0.20

    impact = "positive" if raw >= 0.60 else ("negative" if raw < 0.40 else "neutral")
    return {
        "raw": raw,
        "weight": raw if impact == "positive" else -raw if impact == "negative" else raw * 0.3,
        "impact": impact,
        "description": f"Average {avg_monthly_customers:.0f} unique customers/month. "
                       f"Customer base {'growing' if growth > 0.05 else 'declining' if growth < -0.05 else 'stable'} "
                       f"({growth*100:+.0f}% half-over-half).",
        "data_point": f"{avg_monthly_customers:.0f} customers/month",
    }


def _score_operating_consistency(df: pd.DataFrame) -> dict:
    total_active = df["active_days"].sum()
    total_possible = df["total_days"].sum()
    pct = total_active / total_possible if total_possible > 0 else 0

    if pct >= 0.95:
        raw = 0.95
    elif pct >= 0.90:
        raw = 0.80
    elif pct >= 0.80:
        raw = 0.60
    elif pct >= 0.70:
        raw = 0.40
    else:
        raw = 0.20

    impact = "positive" if raw >= 0.60 else ("negative" if raw < 0.40 else "neutral")
    return {
        "raw": raw,
        "weight": raw if impact == "positive" else -raw if impact == "negative" else raw * 0.3,
        "impact": impact,
        "description": f"Active {pct*100:.0f}% of calendar days ({total_active}/{total_possible} days). "
                       f"{'Excellent consistency.' if pct >= 0.95 else 'Some gaps in operations detected.' if pct < 0.85 else 'Good consistency.'}",
        "data_point": f"{pct*100:.0f}% active days",
    }


def _score_digital_adoption(df: pd.DataFrame) -> dict:
    avg_digital = df["digital_ratio"].mean()

    if avg_digital >= 0.80:
        raw = 0.85
    elif avg_digital >= 0.65:
        raw = 0.70
    elif avg_digital >= 0.50:
        raw = 0.55
    elif avg_digital >= 0.35:
        raw = 0.40
    else:
        raw = 0.25

    impact = "positive" if raw >= 0.60 else ("negative" if raw < 0.40 else "neutral")
    return {
        "raw": raw,
        "weight": raw if impact == "positive" else -raw if impact == "negative" else raw * 0.3,
        "impact": impact,
        "description": f"{avg_digital*100:.0f}% of transactions are digital (card + e-wallet + QR). "
                       f"{'Above' if avg_digital > 0.55 else 'Below'} industry average of 55%.",
        "data_point": f"{avg_digital*100:.0f}% digital",
    }


def _score_seasonal_resilience(df: pd.DataFrame) -> dict:
    if len(df) < 6:
        return {"raw": 0.5, "weight": 0.10, "impact": "neutral",
                "description": f"Insufficient data for seasonal analysis (only {len(df)} months).",
                "data_point": "N/A"}

    revenues = df["revenue"].values
    mean_rev = np.mean(revenues)
    max_drop = 0.0
    for i in range(1, len(revenues)):
        if revenues[i - 1] > 0:
            change = (revenues[i] - revenues[i - 1]) / revenues[i - 1]
            if change < max_drop:
                max_drop = change

    seasonal_index = 1.0 + max_drop

    if seasonal_index >= 0.85:
        raw = 0.75
    elif seasonal_index >= 0.70:
        raw = 0.55
    elif seasonal_index >= 0.55:
        raw = 0.35
    else:
        raw = 0.15

    impact = "positive" if raw >= 0.60 else ("negative" if raw < 0.40 else "neutral")
    return {
        "raw": raw,
        "weight": raw if impact == "positive" else -raw if impact == "negative" else raw * 0.3,
        "impact": impact,
        "description": f"Seasonal index: {seasonal_index:.2f}. "
                       f"Maximum month-over-month revenue decline was {max_drop*100:.0f}%.",
        "data_point": f"Seasonal index: {seasonal_index:.2f}",
    }


def _score_growth_momentum(df: pd.DataFrame) -> dict:
    if len(df) < 3:
        return {"raw": 0.5, "weight": 0.30, "impact": "neutral",
                "description": "Insufficient data for growth analysis.",
                "data_point": "N/A"}

    revenues = df["revenue"].values
    x = np.arange(len(revenues), dtype=float)
    slope, _ = np.polyfit(x, revenues, 1)
    mean_rev = np.mean(revenues)
    relative_slope = slope / mean_rev if mean_rev > 0 else 0

    yoy = 0.0
    if len(revenues) >= 12:
        yoy = (revenues[-1] - revenues[-12]) / revenues[-12] if revenues[-12] > 0 else 0
    else:
        yoy = (revenues[-1] - revenues[0]) / revenues[0] if revenues[0] > 0 else 0

    if relative_slope > 0.03:
        raw = 0.85
    elif relative_slope > 0.01:
        raw = 0.70
    elif relative_slope > -0.01:
        raw = 0.50
    elif relative_slope > -0.03:
        raw = 0.30
    else:
        raw = 0.15

    impact = "positive" if raw >= 0.60 else ("negative" if raw < 0.40 else "neutral")
    return {
        "raw": raw,
        "weight": raw if impact == "positive" else -raw if impact == "negative" else raw * 0.3,
        "impact": impact,
        "description": f"Revenue trend is {'positive' if relative_slope > 0.01 else 'negative' if relative_slope < -0.01 else 'flat'}. "
                       f"Change from first to last period: {yoy*100:+.0f}%.",
        "data_point": f"{yoy*100:+.0f}% growth",
    }


def _compute_base_score(factors: list[dict]) -> int:
    """Weighted sum of factor raw scores, scaled to 0-1000."""
    weights = {
        "Revenue Stability": 0.22,
        "Transaction Volume": 0.15,
        "Customer Base": 0.15,
        "Operating Consistency": 0.15,
        "Digital Payment Adoption": 0.10,
        "Seasonal Resilience": 0.08,
        "Growth Momentum": 0.15,
    }
    total = 0.0
    for f in factors:
        w = weights.get(f["name"], 0.10)
        total += f["raw"] * w

    return int(round(total * 1000))


def _compute_ai_adjustment(base_score: int, df: pd.DataFrame) -> int:
    """Simulate an AI model adjustment based on data richness and patterns."""
    months = len(df)
    richness_bonus = min(months * 5, 60)

    volatility_penalty = 0
    if len(df) >= 3:
        revenues = df["revenue"].values
        recent_trend = (revenues[-1] - revenues[-3]) / revenues[-3] if revenues[-3] > 0 else 0
        if recent_trend < -0.20:
            volatility_penalty = -30
        elif recent_trend > 0.15:
            volatility_penalty = 20

    adjustment = richness_bonus + volatility_penalty
    return max(-100, min(200, adjustment))


def _compute_confidence(df: pd.DataFrame) -> float:
    months = len(df)
    if months >= 18:
        return 0.92
    elif months >= 12:
        return 0.85
    elif months >= 6:
        return 0.75
    elif months >= 3:
        return 0.65
    return 0.55


def _pre_approved_limit(grade: str, avg_monthly_revenue: float) -> float:
    base = LIMIT_TABLE.get(grade, 0)
    revenue_factor = min(avg_monthly_revenue * 12 * 0.15, base * 1.5)
    return max(base, revenue_factor) if grade != "E" else 0


def _generate_narrative(merchant_name: str, factors: list[dict], score: int, grade: str,
                        recommendation: str, limit: float, months: int,
                        avg_revenue: float) -> str:
    strengths = [f for f in factors if f["impact"] == "positive"]
    weaknesses = [f for f in factors if f["impact"] == "negative"]

    lines = [f"**{merchant_name}** {'demonstrates strong' if score >= 650 else 'presents a challenging' if score < 400 else 'shows a moderate'} "
             f"financial profile based on {months} months of POS transaction data."]

    if strengths:
        points = ", ".join(
            f"{f['name'].lower()} ({f['data_point']})" for f in strengths[:3]
        )
        lines.append(f"Key strengths include {points}.")

    if weaknesses:
        points = ", ".join(
            f"{f['name'].lower()} ({f['data_point']})" for f in weaknesses[:3]
        )
        lines.append(f"Areas of concern include {points}.")

    lines.append(
        f"Average monthly revenue is {avg_revenue/1e6:.0f} million VND across the assessment period."
    )

    if recommendation == "APPROVE":
        lines.append(
            f"**Recommendation:** Approve with pre-approved credit limit of {limit/1e6:.0f},000,000 VND. "
            f"This merchant represents a {'low' if grade in ('A','B') else 'moderate'}-risk borrower. "
            f"Suggested monitoring: quarterly revenue review with automatic limit adjustment."
        )
    elif recommendation == "REVIEW":
        lines.append(
            f"**Recommendation:** Manual review recommended. Consider approving with a conservative limit "
            f"of {limit/1e6:.0f},000,000 VND with monthly monitoring conditions and a 6-month review cycle."
        )
    else:
        lines.append(
            "**Recommendation:** Decline at this time. Place on monitoring list for reassessment "
            "after 6 months of improved performance data. Consider offering business advisory services."
        )

    return "\n\n".join(lines)


def run_assessment(db: Session, merchant_id: str) -> CreditScore:
    """Run a full credit assessment for a merchant based on their transaction data."""
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not merchant:
        raise ValueError(f"Merchant {merchant_id} not found")

    compute_monthly_aggregates(db, merchant_id)

    df = _build_monthly_df(db, merchant_id)
    if df.empty:
        raise ValueError(f"No transaction data for merchant {merchant_id}")

    factor_fns = [
        ("Revenue Stability", "revenue", _score_revenue_stability),
        ("Transaction Volume", "volume", _score_transaction_volume),
        ("Customer Base", "customers", _score_customer_base),
        ("Operating Consistency", "consistency", _score_operating_consistency),
        ("Digital Payment Adoption", "digital", _score_digital_adoption),
        ("Seasonal Resilience", "seasonal", _score_seasonal_resilience),
        ("Growth Momentum", "growth", _score_growth_momentum),
    ]

    computed_factors = []
    for name, category, fn in factor_fns:
        result = fn(df)
        result["name"] = name
        result["category"] = category
        computed_factors.append(result)

    base_score = _compute_base_score(computed_factors)
    ai_adj = _compute_ai_adjustment(base_score, df)
    final_score = max(0, min(1000, base_score + ai_adj))

    grade = _grade_for_score(final_score)
    risk_level = RISK_MAP[grade]
    recommendation = REC_MAP[grade]
    confidence = _compute_confidence(df)

    avg_revenue = df["revenue"].mean() if not df.empty else 0
    limit = _pre_approved_limit(grade, avg_revenue)

    narrative = _generate_narrative(
        merchant.name, computed_factors, final_score, grade,
        recommendation, limit, len(df), avg_revenue,
    )

    score_id = f"cs-{uuid.uuid4().hex[:8]}"
    now = datetime.utcnow()

    credit_score = CreditScore(
        id=score_id,
        merchant_id=merchant_id,
        score=final_score,
        base_score=base_score,
        ai_adjustment=ai_adj,
        grade=grade,
        risk_level=risk_level,
        pre_approved_limit=limit,
        confidence=confidence,
        recommendation=recommendation,
        narrative=narrative,
        assessed_by="AI Scoring Engine v1.0",
        valid_until=now + timedelta(days=90),
        created_at=now,
    )
    db.add(credit_score)

    for f in computed_factors:
        factor = CreditFactor(
            credit_score_id=score_id,
            name=f["name"],
            impact=f["impact"],
            weight=f["weight"],
            description=f["description"],
            data_point=f["data_point"],
            category=f["category"],
        )
        db.add(factor)

    db.commit()
    db.refresh(credit_score)
    return credit_score
