from __future__ import annotations

from typing import Optional, Literal, List

from pydantic import BaseModel


class CreditScoreSummary(BaseModel):
    score: int
    grade: Literal["A", "B", "C", "D", "E"]
    riskLevel: Literal["VERY_LOW", "LOW", "MEDIUM", "HIGH", "VERY_HIGH"]
    preApprovedLimit: float
    recommendation: Literal["APPROVE", "REVIEW", "DECLINE"]


class MerchantOut(BaseModel):
    id: str
    name: str
    businessRegNo: Optional[str] = None
    taxId: Optional[str] = None
    category: str
    subCategory: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    city: str
    posProvider: str
    contactName: Optional[str] = None
    contactPhone: Optional[str] = None
    contactEmail: Optional[str] = None
    status: Literal["ACTIVE", "INACTIVE", "SUSPENDED"]
    monthsActive: int
    createdAt: str
    updatedAt: str
    latestScore: Optional[CreditScoreSummary] = None


class MerchantListResponse(BaseModel):
    merchants: List[MerchantOut]
    total: int


class MerchantCreate(BaseModel):
    name: str
    businessRegNo: Optional[str] = None
    taxId: Optional[str] = None
    category: str
    subCategory: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    city: str = "Ho Chi Minh City"
    posProvider: str
    contactName: Optional[str] = None
    contactPhone: Optional[str] = None
    contactEmail: Optional[str] = None
