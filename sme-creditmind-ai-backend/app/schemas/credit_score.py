from __future__ import annotations

from typing import Optional, Literal, List

from pydantic import BaseModel


class CreditFactorOut(BaseModel):
    name: str
    impact: Literal["positive", "negative", "neutral"]
    weight: float
    description: str
    dataPoint: str
    category: Literal["revenue", "volume", "customers", "consistency", "digital", "seasonal", "growth"]


class CreditScoreOut(BaseModel):
    id: str
    merchantId: str
    score: int
    baseScore: int
    aiAdjustment: int
    grade: Literal["A", "B", "C", "D", "E"]
    riskLevel: Literal["VERY_LOW", "LOW", "MEDIUM", "HIGH", "VERY_HIGH"]
    preApprovedLimit: float
    confidence: float
    factors: List[CreditFactorOut]
    narrative: str
    recommendation: Literal["APPROVE", "REVIEW", "DECLINE"]
    assessedBy: Optional[str] = None
    validUntil: str
    createdAt: str
