from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.merchant import Merchant
from app.models.credit_score import CreditScore, CreditFactor
from app.models.transaction import MonthlyAggregate
from app.schemas.merchant import (
    MerchantOut,
    MerchantListResponse,
    MerchantCreate,
    CreditScoreSummary,
)
from app.schemas.credit_score import CreditScoreOut, CreditFactorOut
from app.schemas.transaction import MonthlyRevenueOut

router = APIRouter(prefix="/api/merchants", tags=["merchants"])


def _to_merchant_out(m: Merchant, latest: Optional[CreditScore] = None) -> MerchantOut:
    summary = None
    if latest:
        summary = CreditScoreSummary(
            score=latest.score,
            grade=latest.grade,
            riskLevel=latest.risk_level,
            preApprovedLimit=latest.pre_approved_limit,
            recommendation=latest.recommendation,
        )

    return MerchantOut(
        id=m.id,
        name=m.name,
        businessRegNo=m.business_reg_no,
        taxId=m.tax_id,
        category=m.category,
        subCategory=m.sub_category,
        address=m.address,
        district=m.district,
        city=m.city,
        posProvider=m.pos_provider,
        contactName=m.contact_name,
        contactPhone=m.contact_phone,
        contactEmail=m.contact_email,
        status=m.status,
        monthsActive=m.months_active,
        createdAt=m.created_at.isoformat() + "Z",
        updatedAt=m.updated_at.isoformat() + "Z",
        latestScore=summary,
    )


def _get_latest_score(db: Session, merchant_id: str) -> Optional[CreditScore]:
    return (
        db.query(CreditScore)
        .filter(CreditScore.merchant_id == merchant_id)
        .order_by(desc(CreditScore.created_at))
        .first()
    )


@router.get("", response_model=MerchantListResponse)
def list_merchants(
    search: Optional[str] = Query(None),
    grade: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Merchant).order_by(desc(Merchant.updated_at))
    merchants = query.all()

    results: List[MerchantOut] = []
    for m in merchants:
        latest = _get_latest_score(db, m.id)

        if search:
            s = search.lower()
            if s not in m.name.lower() and s not in m.category.lower():
                continue

        if grade and (not latest or latest.grade != grade):
            continue

        results.append(_to_merchant_out(m, latest))

    return MerchantListResponse(merchants=results, total=len(results))


@router.get("/{merchant_id}")
def get_merchant(merchant_id: str, db: Session = Depends(get_db)):
    m = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Merchant not found")

    latest = _get_latest_score(db, merchant_id)

    credit_score_out = None
    if latest:
        factors = (
            db.query(CreditFactor)
            .filter(CreditFactor.credit_score_id == latest.id)
            .all()
        )
        credit_score_out = CreditScoreOut(
            id=latest.id,
            merchantId=latest.merchant_id,
            score=latest.score,
            baseScore=latest.base_score,
            aiAdjustment=latest.ai_adjustment,
            grade=latest.grade,
            riskLevel=latest.risk_level,
            preApprovedLimit=latest.pre_approved_limit,
            confidence=latest.confidence,
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
            narrative=latest.narrative,
            recommendation=latest.recommendation,
            assessedBy=latest.assessed_by,
            validUntil=latest.valid_until.isoformat() + "Z",
            createdAt=latest.created_at.isoformat() + "Z",
        )

    monthly_aggs = (
        db.query(MonthlyAggregate)
        .filter(MonthlyAggregate.merchant_id == merchant_id)
        .order_by(MonthlyAggregate.month)
        .all()
    )
    revenue_out = [
        MonthlyRevenueOut(
            month=a.month,
            revenue=a.revenue,
            transactionCount=a.transaction_count,
            uniqueCustomers=a.unique_customers,
            avgTicketSize=a.avg_ticket_size,
        )
        for a in monthly_aggs
    ]

    return {
        "merchant": _to_merchant_out(m, latest),
        "creditScore": credit_score_out,
        "monthlyRevenue": revenue_out,
    }


@router.post("", response_model=MerchantOut, status_code=201)
def create_merchant(body: MerchantCreate, db: Session = Depends(get_db)):
    m = Merchant(
        id=f"m-{uuid.uuid4().hex[:8]}",
        name=body.name,
        business_reg_no=body.businessRegNo,
        tax_id=body.taxId,
        category=body.category,
        sub_category=body.subCategory,
        address=body.address,
        district=body.district,
        city=body.city,
        pos_provider=body.posProvider,
        contact_name=body.contactName,
        contact_phone=body.contactPhone,
        contact_email=body.contactEmail,
        status="ACTIVE",
        months_active=0,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return _to_merchant_out(m)
