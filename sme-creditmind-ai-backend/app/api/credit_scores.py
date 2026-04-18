from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.credit_score import CreditScore, CreditFactor
from app.schemas.credit_score import CreditScoreOut, CreditFactorOut
from app.services.scoring_engine import run_assessment

router = APIRouter(tags=["credit-scores"])


def _score_to_out(score: CreditScore, factors: list[CreditFactor]) -> CreditScoreOut:
    return CreditScoreOut(
        id=score.id,
        merchantId=score.merchant_id,
        score=score.score,
        baseScore=score.base_score,
        aiAdjustment=score.ai_adjustment,
        grade=score.grade,
        riskLevel=score.risk_level,
        preApprovedLimit=score.pre_approved_limit,
        confidence=score.confidence,
        factors=[
            CreditFactorOut(
                name=f.name,
                impact=f.impact,
                weight=f.weight,
                description=f.description,
                dataPoint=f.data_point,
                category=f.category,
            )
            for f in factors
        ],
        narrative=score.narrative,
        recommendation=score.recommendation,
        assessedBy=score.assessed_by,
        validUntil=score.valid_until.isoformat() + "Z",
        createdAt=score.created_at.isoformat() + "Z",
    )


@router.get("/api/credit-score/{merchant_id}", response_model=CreditScoreOut)
def get_credit_score(merchant_id: str, db: Session = Depends(get_db)):
    score = (
        db.query(CreditScore)
        .filter(CreditScore.merchant_id == merchant_id)
        .order_by(desc(CreditScore.created_at))
        .first()
    )
    if not score:
        raise HTTPException(404, "No credit score found for this merchant")

    factors = (
        db.query(CreditFactor)
        .filter(CreditFactor.credit_score_id == score.id)
        .all()
    )
    return _score_to_out(score, factors)


@router.post("/api/assess/{merchant_id}", response_model=CreditScoreOut)
def assess_merchant(merchant_id: str, db: Session = Depends(get_db)):
    """Trigger a new credit assessment from real transaction data."""
    try:
        score = run_assessment(db, merchant_id)
    except ValueError as e:
        raise HTTPException(400, str(e))

    factors = (
        db.query(CreditFactor)
        .filter(CreditFactor.credit_score_id == score.id)
        .all()
    )
    return _score_to_out(score, factors)
