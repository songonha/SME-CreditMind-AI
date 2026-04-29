from __future__ import annotations

import hashlib
import logging
import secrets
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.bootstrap import ensure_subscription_plans
from app.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.database import get_db
from app.deps.auth import get_current_user
from app.models.membership import Membership
from app.models.organization import Organization
from app.models.subscription import OrgSubscription
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User
from app.limiter import limiter
from app.schemas.auth import (
    ChangePasswordRequest,
    ChangePasswordResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    MeResponse,
    OrgSummary,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    ResetPasswordResponse,
    TokenResponse,
    UserOut,
)
from app.services.email_service import send_password_reset_email

router = APIRouter(prefix="/api/auth", tags=["auth"])
logger = logging.getLogger(__name__)

FORGOT_PASSWORD_MESSAGE = (
    "If an account exists for this email, password reset instructions have been sent."
)


def _hash_reset_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _org_summaries(db: Session, user_id: str) -> list[OrgSummary]:
    rows = db.query(Membership).filter(Membership.user_id == user_id).all()
    out: list[OrgSummary] = []
    for m in rows:
        o = db.query(Organization).filter(Organization.id == m.organization_id).first()
        if o:
            out.append(OrgSummary(id=o.id, name=o.name, slug=o.slug, role=m.role))
    return out


@router.post("/register", response_model=TokenResponse)
@limiter.limit("12/minute")
def register(request: Request, body: RegisterRequest, db: Session = Depends(get_db)):
    ensure_subscription_plans(db)
    if db.query(User).filter(User.email == body.email.lower()).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(Organization).filter(Organization.slug == body.organization_slug).first():
        raise HTTPException(status_code=400, detail="Organization slug already taken")

    org = Organization(
        id=f"org-{uuid.uuid4().hex[:12]}",
        name=body.organization_name,
        slug=body.organization_slug,
    )
    user = User(
        id=f"usr-{uuid.uuid4().hex[:12]}",
        email=body.email.lower(),
        hashed_password=hash_password(body.password),
        full_name=body.full_name or body.email.split("@")[0],
    )
    db.add(org)
    db.add(user)
    db.flush()

    db.add(
        Membership(
            user_id=user.id,
            organization_id=org.id,
            role="ORG_ADMIN",
        )
    )
    db.add(
        OrgSubscription(
            organization_id=org.id,
            plan_id="plan-trial",
        )
    )
    db.commit()

    access = create_access_token(user.id)
    refresh = create_refresh_token(user.id)
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        user=UserOut(id=user.id, email=user.email, full_name=user.full_name),
        organizations=_org_summaries(db, user.id),
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("30/minute")
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    access = create_access_token(user.id)
    refresh = create_refresh_token(user.id)
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        user=UserOut(id=user.id, email=user.email, full_name=user.full_name),
        organizations=_org_summaries(db, user.id),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(body: RefreshRequest, db: Session = Depends(get_db)):
    try:
        payload = decode_token(body.refresh_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token") from None
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")
    access = create_access_token(user.id)
    refresh = create_refresh_token(user.id)
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        user=UserOut(id=user.id, email=user.email, full_name=user.full_name),
        organizations=_org_summaries(db, user.id),
    )


@router.get("/me", response_model=MeResponse)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return MeResponse(
        user=UserOut(id=user.id, email=user.email, full_name=user.full_name),
        organizations=_org_summaries(db, user.id),
    )


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
@limiter.limit("5/minute")
def forgot_password(request: Request, body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower().strip()).first()
    if user and user.is_active:
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
        ).delete(synchronize_session=False)
        raw = secrets.token_urlsafe(32)
        token_hash = _hash_reset_token(raw)
        expires = datetime.utcnow() + timedelta(minutes=settings.PASSWORD_RESET_TOKEN_TTL_MINUTES)
        db.add(
            PasswordResetToken(
                id=f"prt-{uuid.uuid4().hex[:12]}",
                user_id=user.id,
                token_hash=token_hash,
                expires_at=expires,
            )
        )
        db.commit()
        base = settings.PUBLIC_APP_URL.rstrip("/")
        reset_url = f"{base}/reset-password?token={raw}"
        sent = send_password_reset_email(user.email, reset_url)
        if not sent:
            logger.info("Password reset token created for user_id=%s (email delivery not configured)", user.id)
    return ForgotPasswordResponse(message=FORGOT_PASSWORD_MESSAGE)


@router.post("/reset-password", response_model=ResetPasswordResponse)
@limiter.limit("10/minute")
def reset_password(request: Request, body: ResetPasswordRequest, db: Session = Depends(get_db)):
    token_hash = _hash_reset_token(body.token.strip())
    row = db.query(PasswordResetToken).filter(PasswordResetToken.token_hash == token_hash).first()
    now = datetime.utcnow()
    if (
        row is None
        or row.used_at is not None
        or row.expires_at < now
    ):
        raise HTTPException(status_code=400, detail="Invalid or expired reset link.")
    user = db.query(User).filter(User.id == row.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link.")
    user.hashed_password = hash_password(body.new_password)
    row.used_at = now
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at.is_(None),
        PasswordResetToken.id != row.id,
    ).delete(synchronize_session=False)
    db.commit()
    return ResetPasswordResponse(message="Password has been reset. You can sign in with your new password.")


@router.post("/change-password", response_model=ChangePasswordResponse)
def change_password(
    body: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(body.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    user.hashed_password = hash_password(body.new_password)
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at.is_(None),
    ).delete(synchronize_session=False)
    db.commit()
    return ChangePasswordResponse(message="Password updated successfully.")
