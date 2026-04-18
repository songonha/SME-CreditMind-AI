from __future__ import annotations

import csv
import io
import json
import uuid
from datetime import datetime
from typing import List, Dict, Set

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.merchant import Merchant
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionUploadResponse
from app.services.scoring_engine import compute_monthly_aggregates

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


@router.post("/upload", response_model=TransactionUploadResponse)
async def upload_transactions(
    merchant_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not merchant:
        raise HTTPException(404, "Merchant not found")

    content = await file.read()
    text = content.decode("utf-8")

    rows: List[Dict] = []
    if file.filename and file.filename.endswith(".json"):
        rows = json.loads(text)
    else:
        reader = csv.DictReader(io.StringIO(text))
        rows = list(reader)

    imported = 0
    months_seen: Set[str] = set()
    for row in rows:
        amount = float(row.get("amount", 0))
        if amount <= 0:
            continue

        txn_at_str = row.get("transaction_at") or row.get("transactionAt") or row.get("date", "")
        try:
            txn_at = datetime.fromisoformat(txn_at_str.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            continue

        txn = Transaction(
            id=row.get("id") or f"txn-{uuid.uuid4().hex[:12]}",
            merchant_id=merchant_id,
            amount=amount,
            currency=row.get("currency", "VND"),
            payment_method=row.get("payment_method", row.get("paymentMethod", "CASH")),
            terminal_id=row.get("terminal_id", row.get("terminalId")),
            customer_id=row.get("customer_id", row.get("customerId")),
            category=row.get("category"),
            description=row.get("description"),
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
