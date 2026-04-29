from __future__ import annotations

import csv
import io
import json
import math
import uuid
from datetime import datetime
from typing import Any, Dict, List, Mapping, Set

import pandas as pd
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps.auth import OrgContext, get_org_context
from app.models.merchant import Merchant
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionUploadResponse
from app.services.scoring_engine import compute_monthly_aggregates

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


def _normalize_keys(row: Mapping[str, Any]) -> Dict[str, Any]:
    """Map messy POS / Excel headers to lowercase snake_case keys."""
    out: Dict[str, Any] = {}
    for k, v in row.items():
        if k is None:
            continue
        key = str(k).strip().lower().replace(" ", "_").replace("-", "_")
        if key == "":
            continue
        if v is not None and isinstance(v, float) and math.isnan(v):
            continue
        out[key] = v
    return out


def _parse_datetime(val: Any) -> datetime | None:
    if val is None or val == "":
        return None
    if isinstance(val, datetime):
        return val
    if hasattr(val, "to_pydatetime"):
        try:
            return val.to_pydatetime()  # pandas.Timestamp
        except Exception:
            pass
    if isinstance(val, str):
        s = val.strip().replace("Z", "+00:00")
        try:
            return datetime.fromisoformat(s)
        except ValueError:
            return None
    return None


def _row_transaction_at(row: Dict[str, Any]) -> datetime | None:
    for key in (
        "transaction_at",
        "transactionat",
        "date",
        "txn_date",
        "transaction_date",
        "sale_date",
        "created_at",
        "time",
        "trans_date",
    ):
        dt = _parse_datetime(row.get(key))
        if dt is not None:
            return dt
    return None


def _row_amount(row: Dict[str, Any]) -> float:
    for key in ("amount", "total", "sale_amount", "txn_amount", "gross_amount"):
        raw = row.get(key)
        if raw is None or raw == "":
            continue
        try:
            return float(raw)
        except (TypeError, ValueError):
            continue
    return 0.0


def _load_rows_from_upload(filename: str | None, content: bytes) -> List[Dict[str, Any]]:
    lower = (filename or "").lower()
    if lower.endswith(".json"):
        parsed = json.loads(content.decode("utf-8-sig"))
        if isinstance(parsed, dict):
            parsed = [parsed]
        if not isinstance(parsed, list):
            raise ValueError("JSON must be an array of transaction objects or a single object")
        return [_normalize_keys(r) for r in parsed if isinstance(r, dict)]

    if lower.endswith((".xlsx", ".xls")):
        df = pd.read_excel(io.BytesIO(content))
        df = df.where(pd.notna(df), None)
        rows_raw = df.to_dict(orient="records")
        return [_normalize_keys(r) for r in rows_raw]

    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("utf-8", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    return [_normalize_keys(dict(r)) for r in reader]


@router.post("/upload", response_model=TransactionUploadResponse)
async def upload_transactions(
    merchant_id: str = Form(...),
    file: UploadFile = File(...),
    ctx: OrgContext = Depends(get_org_context),
    db: Session = Depends(get_db),
):
    merchant = (
        db.query(Merchant)
        .filter(
            Merchant.id == merchant_id,
            Merchant.organization_id == ctx.organization_id,
        )
        .first()
    )
    if not merchant:
        raise HTTPException(404, "Merchant not found")

    content = await file.read()
    try:
        rows = _load_rows_from_upload(file.filename, content)
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(400, f"Could not parse file: {e}") from e
    except Exception as e:
        raise HTTPException(400, f"Could not read spreadsheet: {e}") from e

    imported = 0
    months_seen: Set[str] = set()
    for row in rows:
        amount = _row_amount(row)
        if amount <= 0:
            continue

        txn_at = _row_transaction_at(row)
        if txn_at is None:
            continue

        pay_raw = row.get("payment_method") or row.get("paymentmethod") or "CASH"
        pay_method = str(pay_raw).strip().upper()[:20] if pay_raw else "CASH"

        tid = row.get("terminal_id") or row.get("terminalid")
        cid = row.get("customer_id") or row.get("customerid")
        tid_s = str(tid).strip()[:50] if tid not in (None, "") else None
        cid_s = str(cid).strip()[:50] if cid not in (None, "") else None

        rid = row.get("id")
        rid_s = str(rid).strip()[:36] if rid not in (None, "") else None

        cur_raw = row.get("currency") or "VND"
        currency = str(cur_raw).strip().upper()[:3] if cur_raw else "VND"

        cat = row.get("category")
        category = str(cat).strip()[:100] if cat not in (None, "") else None
        desc = row.get("description")
        description = str(desc).strip()[:500] if desc not in (None, "") else None

        txn = Transaction(
            id=rid_s or f"txn-{uuid.uuid4().hex[:12]}",
            merchant_id=merchant_id,
            amount=amount,
            currency=currency,
            payment_method=pay_method,
            terminal_id=tid_s,
            customer_id=cid_s,
            category=category,
            description=description,
            transaction_at=txn_at,
        )
        db.add(txn)
        imported += 1
        months_seen.add(txn_at.strftime("%Y-%m"))

    db.commit()

    compute_monthly_aggregates(db, merchant_id)

    if months_seen:
        months_active = len(months_seen)
        merchant.months_active = months_active
        merchant.updated_at = datetime.utcnow()
        db.commit()

    return TransactionUploadResponse(
        merchantId=merchant_id,
        totalImported=imported,
        monthsCovered=len(months_seen),
        message=f"Successfully imported {imported} transactions across {len(months_seen)} months.",
    )
