from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps.auth import OrgContext, get_org_context
from app.services.entitlements import assert_ai_quota, record_ai_usage
from app.services.financial_document_pipeline import run_financial_document_pipeline

router = APIRouter(prefix="/api/ai", tags=["ai"])

MAX_UPLOAD_BYTES = 15 * 1024 * 1024
ALLOWED_CONTENT_TYPES = frozenset(
    {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
    }
)


@router.post("/financial-document-pipeline")
async def financial_document_pipeline(
    file: UploadFile = File(...),
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Multi-document flow: utility bill / POS / bank statement image → parse → analyze → credit JSON.
    """
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if content_type and content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported content type: {file.content_type}. Use JPEG, PNG, WebP, or GIF.",
        )

    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 15MB).")
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="Empty file.")

    mime = content_type if content_type in ALLOWED_CONTENT_TYPES else "image/jpeg"

    assert_ai_quota(db, ctx.organization_id)
    try:
        result = await run_financial_document_pipeline(image_bytes=data, mime_type=mime)
        record_ai_usage(
            db,
            organization_id=ctx.organization_id,
            user_id=ctx.user.id,
            event_type="financial_document_pipeline",
        )
        return result
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=f"Model output error: {exc}") from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"Pipeline failed: {exc}") from exc
