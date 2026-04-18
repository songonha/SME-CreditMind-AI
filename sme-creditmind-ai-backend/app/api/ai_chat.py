from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.merchant import Merchant
from app.models.credit_score import CreditScore, CreditFactor
from app.models.transaction import MonthlyAggregate
from app.services.pos_orchestrator import assess_pos_capture, get_provider_runtime_config, get_provider_health

router = APIRouter(prefix="/api/ai", tags=["ai"])


class ChatRequest(BaseModel):
    message: str
    merchantId: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    merchantId: Optional[str] = None


class PosAssessmentRequest(BaseModel):
    captureId: str
    fileName: str
    mimeType: str
    base64Data: str


class PosFactor(BaseModel):
    name: str
    impact: Literal["positive", "negative", "neutral"]
    weight: float
    description: str
    dataPoint: str
    category: Literal["revenue", "volume", "customers", "consistency", "digital", "seasonal", "growth"]


class PosAssessmentResult(BaseModel):
    captureId: str
    fileName: str
    score: int
    grade: Literal["A", "B", "C", "D", "E"]
    riskLevel: Literal["VERY_LOW", "LOW", "MEDIUM", "HIGH", "VERY_HIGH"]
    recommendation: Literal["APPROVE", "REVIEW", "DECLINE"]
    confidence: float
    summary: str
    factors: List[PosFactor]
    assessedAt: str


class SavePosAssessmentRequest(BaseModel):
    merchantId: str
    analysis: PosAssessmentResult


class SavePosAssessmentResponse(BaseModel):
    creditScoreId: str
    merchantId: str
    fileName: str
    message: str


class ProviderRuntimeConfig(BaseModel):
    provider: str
    baseUrl: str
    model: str
    hasApiKey: bool
    organizationConfigured: bool
    projectConfigured: bool


class ProviderRuntimeConfigResponse(BaseModel):
    providers: List[ProviderRuntimeConfig]


class ProviderHealthItem(BaseModel):
    provider: str
    configured: bool
    healthy: bool
    latencyMs: Optional[int] = None
    statusCode: Optional[int] = None
    model: Optional[str] = None
    message: str


class ProviderHealthResponse(BaseModel):
    providers: List[ProviderHealthItem]


@router.get("/providers/config", response_model=ProviderRuntimeConfigResponse)
def ai_provider_config():
    payload = get_provider_runtime_config()
    return ProviderRuntimeConfigResponse(providers=[ProviderRuntimeConfig(**item) for item in payload])


@router.get("/providers/health", response_model=ProviderHealthResponse)
def ai_provider_health():
    payload = get_provider_health()
    return ProviderHealthResponse(providers=[ProviderHealthItem(**item) for item in payload])


@router.post("/chat", response_model=ChatResponse)
def ai_chat(body: ChatRequest, db: Session = Depends(get_db)):
    lower = body.message.lower()

    merchant: Optional[Merchant] = None
    score: Optional[CreditScore] = None
    factors: List[CreditFactor] = []
    aggregates: List[MonthlyAggregate] = []

    if body.merchantId:
        merchant = db.query(Merchant).filter(Merchant.id == body.merchantId).first()
        score = (
            db.query(CreditScore)
            .filter(CreditScore.merchant_id == body.merchantId)
            .order_by(desc(CreditScore.created_at))
            .first()
        )
        if score:
            factors = (
                db.query(CreditFactor)
                .filter(CreditFactor.credit_score_id == score.id)
                .all()
            )
        aggregates = (
            db.query(MonthlyAggregate)
            .filter(MonthlyAggregate.merchant_id == body.merchantId)
            .order_by(MonthlyAggregate.month)
            .all()
        )

    if "risk" in lower or "why" in lower or "factor" in lower:
        response = _explain_risk(merchant, score, factors)
    elif "improve" in lower or "better" in lower or "increase" in lower:
        response = _suggest_improvements(merchant, score, factors)
    elif "what-if" in lower or "scenario" in lower or "20%" in lower:
        response = _whatif_scenario(merchant, score, aggregates)
    elif "compare" in lower or "benchmark" in lower:
        response = _benchmark_compare(merchant, score, db)
    else:
        response = _default_response(merchant, score)

    return ChatResponse(response=response, merchantId=body.merchantId)


@router.post("/pos-assessment", response_model=PosAssessmentResult)
def run_pos_assessment(body: PosAssessmentRequest):
    try:
        payload = assess_pos_capture(
            capture_id=body.captureId,
            file_name=body.fileName,
            mime_type=body.mimeType,
            base64_data=body.base64Data,
        )
        return PosAssessmentResult(**payload)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"POS AI assessment failed: {exc}") from exc


@router.post("/pos-assessment/save", response_model=SavePosAssessmentResponse)
def save_pos_assessment(body: SavePosAssessmentRequest, db: Session = Depends(get_db)):
    merchant = db.query(Merchant).filter(Merchant.id == body.merchantId).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")

    score_id = f"cs-{uuid.uuid4().hex[:8]}"
    score = CreditScore(
        id=score_id,
        merchant_id=merchant.id,
        score=body.analysis.score,
        base_score=body.analysis.score,
        ai_adjustment=0,
        grade=body.analysis.grade,
        risk_level=body.analysis.riskLevel,
        pre_approved_limit=(
            450_000_000
            if body.analysis.grade == "A"
            else 280_000_000
            if body.analysis.grade == "B"
            else 120_000_000
            if body.analysis.grade == "C"
            else 40_000_000
            if body.analysis.grade == "D"
            else 0
        ),
        confidence=body.analysis.confidence,
        recommendation=body.analysis.recommendation,
        narrative=(
            f"[POS Capture: {body.analysis.fileName}] {body.analysis.summary}\n"
            f"Capture ID: {body.analysis.captureId}"
        ),
        assessed_by="pos_capture_ai",
        valid_until=datetime.utcnow() + timedelta(days=90),
    )
    db.add(score)

    for factor in body.analysis.factors:
        db.add(
            CreditFactor(
                credit_score_id=score_id,
                name=factor.name,
                impact=factor.impact,
                weight=factor.weight,
                description=factor.description,
                data_point=factor.dataPoint,
                category=factor.category,
            )
        )

    merchant.updated_at = datetime.utcnow()
    db.commit()

    return SavePosAssessmentResponse(
        creditScoreId=score_id,
        merchantId=merchant.id,
        fileName=body.analysis.fileName,
        message=f"Analysis result saved to merchant {merchant.name}.",
    )


def _explain_risk(
    merchant: Optional[Merchant],
    score: Optional[CreditScore],
    factors: List[CreditFactor],
) -> str:
    if not score or not factors:
        return "No credit assessment data available. Please run an assessment first."

    name = merchant.name if merchant else "This merchant"
    negative = [f for f in factors if f.impact == "negative"]
    positive = [f for f in factors if f.impact == "positive"]

    lines = [f"Based on the POS transaction analysis for **{name}** (Score: {score.score}, Grade {score.grade}):"]

    if negative:
        lines.append("\n**Risk Factors:**")
        for i, f in enumerate(negative, 1):
            lines.append(f"{i}. **{f.name}** — {f.description}")

    if positive:
        lines.append("\n**Strengths:**")
        for i, f in enumerate(positive, 1):
            lines.append(f"{i}. **{f.name}** — {f.description}")

    lines.append("\nWould you like me to elaborate on any specific factor or suggest improvements?")
    return "\n".join(lines)


def _suggest_improvements(
    merchant: Optional[Merchant],
    score: Optional[CreditScore],
    factors: List[CreditFactor],
) -> str:
    if not score:
        return "No credit assessment available. Please run an assessment first."

    negative = [f for f in factors if f.impact == "negative"]
    neutral = [f for f in factors if f.impact == "neutral"]
    targets = negative + neutral

    lines = [f"To improve the credit score (currently {score.score}, Grade {score.grade}), focus on:\n"]

    suggestions = {
        "revenue": ("Stabilize Revenue", "+40-80 points", "Reduce month-to-month variance by building recurring revenue streams and maintaining cash reserves."),
        "volume": ("Increase Transaction Volume", "+30-50 points", "Drive more daily transactions through promotions, loyalty programs, and extended hours."),
        "customers": ("Diversify Customer Base", "+50-80 points", "Reduce dependency on top customers. Target below 25% revenue concentration from top customers."),
        "consistency": ("Improve Operating Consistency", "+30-50 points", "Minimize inactive days. Maintain consistent daily operations without extended gaps."),
        "digital": ("Boost Digital Payments", "+20-30 points", "Promote QR code, e-wallet, and card payments to reach 80%+ digital adoption."),
        "seasonal": ("Build Seasonal Buffer", "+20-40 points", "Prepare for seasonal dips with promotions and diversified product offerings."),
        "growth": ("Accelerate Growth", "+40-60 points", "Implement growth strategies for consistent revenue increase over 3+ months."),
    }

    total_min, total_max = 0, 0
    for i, f in enumerate(targets[:5], 1):
        s = suggestions.get(f.category, ("Improve " + f.name, "+20-40 points", f.description))
        lines.append(f"{i}. **{s[0]}** ({s[1]})")
        lines.append(f"   {s[2]}")
        pts = s[1].replace("+", "").replace(" points", "").split("-")
        total_min += int(pts[0])
        total_max += int(pts[1]) if len(pts) > 1 else int(pts[0])

    lines.append(f"\n**Estimated total improvement: {total_min}-{total_max} points** over 6-12 months.")
    return "\n".join(lines)


def _whatif_scenario(
    merchant: Optional[Merchant],
    score: Optional[CreditScore],
    aggregates: List[MonthlyAggregate],
) -> str:
    if not score or not aggregates:
        return "No data available for scenario analysis. Please run an assessment first."

    current_rev = aggregates[-1].revenue if aggregates else 0
    projected_rev = current_rev * 1.2

    projected_score = min(1000, int(score.score * 1.12))
    from app.services.scoring_engine import _grade_for_score, RISK_MAP
    projected_grade = _grade_for_score(projected_score)

    lines = [
        "**What-If Scenario: +20% Revenue Increase**\n",
        "If monthly revenue increases by 20%:\n",
        "| Metric | Current | Projected |",
        "|--------|---------|-----------|",
        f"| Monthly Revenue | {current_rev/1e6:.0f}M VND | {projected_rev/1e6:.0f}M VND |",
        f"| Credit Score | {score.score} | ~{projected_score} |",
        f"| Grade | {score.grade} | {projected_grade} |",
        f"| Risk Level | {score.risk_level.replace('_', ' ')} | {RISK_MAP[projected_grade].replace('_', ' ')} |",
        "\n**Note:** This projection assumes the revenue increase is sustained for at least 3 consecutive months and other factors remain constant.",
    ]
    return "\n".join(lines)


def _benchmark_compare(
    merchant: Optional[Merchant],
    score: Optional[CreditScore],
    db: Session,
) -> str:
    if not score or not merchant:
        return "Please select a merchant first to compare against benchmarks."

    all_scores = db.query(CreditScore.score).all()
    scores = [s[0] for s in all_scores]
    avg = sum(scores) / len(scores) if scores else 0
    rank = sum(1 for s in scores if s <= score.score)
    percentile = (rank / len(scores) * 100) if scores else 0

    lines = [
        f"**Benchmark Comparison for {merchant.name}**\n",
        f"| Metric | {merchant.name} | Portfolio Average |",
        "|--------|---------|-----------|",
        f"| Credit Score | {score.score} | {avg:.0f} |",
        f"| Grade | {score.grade} | — |",
        f"| Percentile | {percentile:.0f}th | 50th |",
        f"\nThis merchant ranks in the **{percentile:.0f}th percentile** of the portfolio.",
    ]
    return "\n".join(lines)


def _default_response(
    merchant: Optional[Merchant],
    score: Optional[CreditScore],
) -> str:
    context = ""
    if merchant and score:
        context = f" Currently analyzing: **{merchant.name}** (Score: {score.score}, Grade {score.grade})."

    return (
        f"I'm the CreditMind AI Co-Pilot.{context} I can help you:\n\n"
        "- **Explain risk factors** — \"What are the main risk factors?\"\n"
        "- **Suggest improvements** — \"How can this merchant improve their score?\"\n"
        "- **Run what-if scenarios** — \"Run a what-if scenario with 20% revenue increase\"\n"
        "- **Compare benchmarks** — \"Compare to industry benchmark\"\n\n"
        "Ask me anything about the merchant's credit profile!"
    )
