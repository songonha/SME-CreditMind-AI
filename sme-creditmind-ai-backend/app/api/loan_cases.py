from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps.auth import OrgContext, get_org_context
from app.models.loan_case import LoanCase
from app.models.merchant import Merchant

router = APIRouter(prefix="/api/loan-cases", tags=["loan-cases"])


class LoanCaseCreate(BaseModel):
    merchantId: str
    status: str = Field(default="DRAFT", max_length=32)
    decisionNote: str = ""


class LoanCaseUpdate(BaseModel):
    status: str | None = Field(default=None, max_length=32)
    decisionNote: str | None = None


class LoanCaseOut(BaseModel):
    id: str
    merchantId: str
    status: str
    decisionNote: str
    createdAt: str
    updatedAt: str


@router.get("", response_model=list[LoanCaseOut])
def list_cases(ctx: OrgContext = Depends(get_org_context), db: Session = Depends(get_db)):
    rows = (
        db.query(LoanCase)
        .filter(LoanCase.organization_id == ctx.organization_id)
        .order_by(LoanCase.updated_at.desc())
        .all()
    )
    return [
        LoanCaseOut(
            id=r.id,
            merchantId=r.merchant_id,
            status=r.status,
            decisionNote=r.decision_note,
            createdAt=r.created_at.isoformat() + "Z",
            updatedAt=r.updated_at.isoformat() + "Z",
        )
        for r in rows
    ]


@router.post("", response_model=LoanCaseOut, status_code=201)
def create_case(
    body: LoanCaseCreate,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db),
):
    m = (
        db.query(Merchant)
        .filter(
            Merchant.id == body.merchantId,
            Merchant.organization_id == ctx.organization_id,
        )
        .first()
    )
    if not m:
        raise HTTPException(404, "Merchant not found")
    lid = f"lc-{uuid.uuid4().hex[:10]}"
    row = LoanCase(
        id=lid,
        organization_id=ctx.organization_id,
        merchant_id=body.merchantId,
        status=body.status,
        decision_note=body.decisionNote,
        created_by_user_id=ctx.user.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return LoanCaseOut(
        id=row.id,
        merchantId=row.merchant_id,
        status=row.status,
        decisionNote=row.decision_note,
        createdAt=row.created_at.isoformat() + "Z",
        updatedAt=row.updated_at.isoformat() + "Z",
    )


@router.patch("/{case_id}", response_model=LoanCaseOut)
def update_case(
    case_id: str,
    body: LoanCaseUpdate,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db),
):
    row = (
        db.query(LoanCase)
        .filter(
            LoanCase.id == case_id,
            LoanCase.organization_id == ctx.organization_id,
        )
        .first()
    )
    if not row:
        raise HTTPException(404, "Case not found")
    if body.status is not None:
        row.status = body.status
    if body.decisionNote is not None:
        row.decision_note = body.decisionNote
    row.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return LoanCaseOut(
        id=row.id,
        merchantId=row.merchant_id,
        status=row.status,
        decisionNote=row.decision_note,
        createdAt=row.created_at.isoformat() + "Z",
        updatedAt=row.updated_at.isoformat() + "Z",
    )
