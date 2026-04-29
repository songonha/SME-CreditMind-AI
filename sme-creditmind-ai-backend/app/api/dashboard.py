from fastapi import APIRouter, Depends
from sqlalchemy import desc, func as sa_func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps.auth import OrgContext, get_org_context
from app.models.merchant import Merchant
from app.models.credit_score import CreditScore
from app.models.alert import Alert
from app.schemas.dashboard import (
    DashboardStatsOut,
    ScoreDistributionItem,
    GradeDistributionItem,
    RecentAssessment,
    AlertOut,
)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

GRADE_COLORS = {"A": "#10b981", "B": "#3b82f6", "C": "#f59e0b", "D": "#f97316", "E": "#ef4444"}
SCORE_RANGES = [
    ("0-200", 0, 200),
    ("200-400", 200, 400),
    ("400-600", 400, 600),
    ("600-800", 600, 800),
    ("800-1000", 800, 1000),
]


@router.get("/stats", response_model=DashboardStatsOut)
def get_dashboard_stats(
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db),
):
    merchants = (
        db.query(Merchant).filter(Merchant.organization_id == ctx.organization_id).all()
    )
    total = len(merchants)

    latest_scores: dict[str, CreditScore] = {}
    for m in merchants:
        score = (
            db.query(CreditScore)
            .filter(CreditScore.merchant_id == m.id)
            .order_by(desc(CreditScore.created_at))
            .first()
        )
        if score:
            latest_scores[m.id] = score

    approved = sum(1 for s in latest_scores.values() if s.recommendation == "APPROVE")
    review = sum(1 for s in latest_scores.values() if s.recommendation == "REVIEW")
    declined = sum(1 for s in latest_scores.values() if s.recommendation == "DECLINE")

    scores = [s.score for s in latest_scores.values()]
    avg_score = int(sum(scores) / len(scores)) if scores else 0
    total_portfolio = sum(s.pre_approved_limit for s in latest_scores.values())

    score_dist = []
    for label, lo, hi in SCORE_RANGES:
        count = sum(1 for s in scores if lo <= s < hi)
        score_dist.append(ScoreDistributionItem(range=label, count=count))

    grade_counts: dict[str, int] = {"A": 0, "B": 0, "C": 0, "D": 0, "E": 0}
    for s in latest_scores.values():
        grade_counts[s.grade] = grade_counts.get(s.grade, 0) + 1

    grade_dist = [
        GradeDistributionItem(grade=g, count=c, color=GRADE_COLORS[g])
        for g, c in grade_counts.items()
    ]

    merchant_map = {m.id: m for m in merchants}
    recent = sorted(latest_scores.values(), key=lambda s: s.created_at, reverse=True)[:10]
    recent_assessments = [
        RecentAssessment(
            id=s.id,
            merchantId=s.merchant_id,
            merchantName=merchant_map[s.merchant_id].name,
            category=merchant_map[s.merchant_id].category,
            score=s.score,
            grade=s.grade,
            recommendation=s.recommendation,
            preApprovedLimit=s.pre_approved_limit,
            assessedAt=s.created_at.isoformat() + "Z",
        )
        for s in recent
        if s.merchant_id in merchant_map
    ]

    merchant_ids = {m.id for m in merchants}
    if merchant_ids:
        alerts_db = (
            db.query(Alert)
            .filter(Alert.merchant_id.in_(merchant_ids))
            .order_by(desc(Alert.created_at))
            .limit(10)
            .all()
        )
    else:
        alerts_db = []
    alerts_out = []
    for a in alerts_db:
        m = merchant_map.get(a.merchant_id)
        if m:
            alerts_out.append(
                AlertOut(
                    id=a.id,
                    merchantId=a.merchant_id,
                    merchantName=m.name,
                    type=a.type,
                    message=a.message,
                    severity=a.severity,
                    createdAt=a.created_at.isoformat() + "Z",
                )
            )

    return DashboardStatsOut(
        totalMerchants=total,
        totalApproved=approved,
        totalReview=review,
        totalDeclined=declined,
        avgScore=avg_score,
        totalPortfolioValue=total_portfolio,
        scoreDistribution=score_dist,
        gradeDistribution=grade_dist,
        recentAssessments=recent_assessments,
        alerts=alerts_out,
    )
