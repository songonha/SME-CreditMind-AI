from __future__ import annotations

import io
import uuid
from datetime import datetime
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps.auth import OrgContext, get_org_context
from app.models.credit_score import CreditScore
from app.models.generated_report import GeneratedReport
from app.models.merchant import Merchant
from app.services.audit_service import write_audit
from app.services.entitlements import (
    assert_report_quota,
    count_ai_usage_this_month,
    count_report_usage_this_month,
    get_org_plan_limits,
)

router = APIRouter(prefix="/api/reports", tags=["reports"])


class ReportListItem(BaseModel):
    id: str
    title: str
    reportType: str
    createdAt: str


class ReportListResponse(BaseModel):
    reports: List[ReportListItem]


class UsageResponse(BaseModel):
    aiUsedThisMonth: int
    aiLimitPerMonth: int
    reportsUsedThisMonth: int
    reportsLimitPerMonth: int


@router.get("/usage", response_model=UsageResponse)
def get_usage(ctx: OrgContext = Depends(get_org_context), db: Session = Depends(get_db)):
    ai_lim, rep_lim = get_org_plan_limits(db, ctx.organization_id)
    return UsageResponse(
        aiUsedThisMonth=count_ai_usage_this_month(db, ctx.organization_id),
        aiLimitPerMonth=ai_lim,
        reportsUsedThisMonth=count_report_usage_this_month(db, ctx.organization_id),
        reportsLimitPerMonth=rep_lim,
    )


@router.get("", response_model=ReportListResponse)
def list_reports(ctx: OrgContext = Depends(get_org_context), db: Session = Depends(get_db)):
    rows = (
        db.query(GeneratedReport)
        .filter(GeneratedReport.organization_id == ctx.organization_id)
        .order_by(desc(GeneratedReport.created_at))
        .limit(100)
        .all()
    )
    return ReportListResponse(
        reports=[
            ReportListItem(
                id=r.id,
                title=r.title,
                reportType=r.report_type,
                createdAt=r.created_at.isoformat() + "Z",
            )
            for r in rows
        ]
    )


@router.post("/generate/portfolio-summary")
def generate_portfolio_summary(
    request: Request,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db),
):
    assert_report_quota(db, ctx.organization_id)

    merchants = (
        db.query(Merchant)
        .filter(Merchant.organization_id == ctx.organization_id)
        .all()
    )
    lines: list[str] = [
        "CreditMind AI — Portfolio summary",
        f"Organization: {ctx.organization_id}",
        f"Generated: {datetime.utcnow().isoformat()}Z",
        f"Merchants: {len(merchants)}",
        "",
    ]
    for m in merchants[:50]:
        score = (
            db.query(CreditScore)
            .filter(CreditScore.merchant_id == m.id)
            .order_by(desc(CreditScore.created_at))
            .first()
        )
        if score:
            lines.append(
                f"- {m.name}: score={score.score} grade={score.grade} rec={score.recommendation}"
            )
        else:
            lines.append(f"- {m.name}: no assessment")

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    y = 750
    for line in lines:
        c.drawString(50, y, line[:120])
        y -= 14
        if y < 50:
            c.showPage()
            y = 750
    c.save()
    pdf_bytes = buffer.getvalue()
    buffer.close()

    rid = f"rpt-{uuid.uuid4().hex[:12]}"
    title = f"Portfolio summary {datetime.utcnow().strftime('%Y-%m-%d')}"
    db.add(
        GeneratedReport(
            id=rid,
            organization_id=ctx.organization_id,
            user_id=ctx.user.id,
            title=title,
            report_type="portfolio_summary",
            storage_path=None,
            content_bytes=pdf_bytes,
            content_mime="application/pdf",
        )
    )
    db.commit()

    write_audit(
        db,
        action="report.generate",
        organization_id=ctx.organization_id,
        user_id=ctx.user.id,
        entity_type="report",
        entity_id=rid,
        detail={"type": "portfolio_summary"},
        ip_address=request.client.host if request.client else None,
    )

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{rid}.pdf"'},
    )


@router.get("/{report_id}/download")
def download_report(
    report_id: str,
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db),
):
    row = (
        db.query(GeneratedReport)
        .filter(
            GeneratedReport.id == report_id,
            GeneratedReport.organization_id == ctx.organization_id,
        )
        .first()
    )
    if not row or not row.content_bytes:
        raise HTTPException(404, "Report not found")
    return StreamingResponse(
        io.BytesIO(row.content_bytes),
        media_type=row.content_mime or "application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{row.id}.pdf"'},
    )
