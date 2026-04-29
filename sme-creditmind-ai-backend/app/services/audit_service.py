from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def write_audit(
    db: Session,
    *,
    action: str,
    organization_id: str | None = None,
    user_id: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    detail: dict[str, Any] | None = None,
    ip_address: str | None = None,
) -> None:
    row = AuditLog(
        organization_id=organization_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        detail_json=json.dumps(detail)[:8000] if detail else None,
        ip_address=ip_address,
    )
    db.add(row)
    db.commit()
