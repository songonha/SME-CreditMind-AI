from __future__ import annotations

from typing import List

from pydantic import BaseModel


class ScoreDistributionItem(BaseModel):
    range: str
    count: int


class GradeDistributionItem(BaseModel):
    grade: str
    count: int
    color: str


class RecentAssessment(BaseModel):
    id: str
    merchantId: str
    merchantName: str
    category: str
    score: int
    grade: str
    recommendation: str
    preApprovedLimit: float
    assessedAt: str


class AlertOut(BaseModel):
    id: str
    merchantId: str
    merchantName: str
    type: str
    message: str
    severity: str
    createdAt: str


class DashboardStatsOut(BaseModel):
    totalMerchants: int
    totalApproved: int
    totalReview: int
    totalDeclined: int
    avgScore: int
    totalPortfolioValue: float
    scoreDistribution: List[ScoreDistributionItem]
    gradeDistribution: List[GradeDistributionItem]
    recentAssessments: List[RecentAssessment]
    alerts: List[AlertOut]
