from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.database import get_db
from app.models.membership import Membership
from app.models.user import User

security = HTTPBearer(auto_error=False)


@dataclass
class OrgContext:
    organization_id: str
    user: User
    membership: Membership
    role: str


def get_current_user(
    db: Session = Depends(get_db),
    creds: HTTPAuthorizationCredentials | None = Depends(security),
) -> User:
    if creds is None or not creds.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    try:
        payload = decode_token(creds.credentials)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from None
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject",
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return user


def get_org_context(
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    x_organization_id: str | None = Header(None, alias="X-Organization-Id"),
) -> OrgContext:
    if not x_organization_id or not x_organization_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-Organization-Id header is required",
        )
    oid = x_organization_id.strip()
    m = (
        db.query(Membership)
        .filter(Membership.user_id == user.id, Membership.organization_id == oid)
        .first()
    )
    if not m:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a member of this organization",
        )
    return OrgContext(organization_id=oid, user=user, membership=m, role=m.role)


def require_roles(*allowed: str):
    def _inner(ctx: Annotated[OrgContext, Depends(get_org_context)]) -> OrgContext:
        if ctx.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient role for this action",
            )
        return ctx

    return _inner
