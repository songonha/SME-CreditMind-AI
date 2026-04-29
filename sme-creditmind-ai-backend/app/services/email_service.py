from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from app.config import settings

logger = logging.getLogger(__name__)


def send_password_reset_email(to_email: str, reset_url: str) -> bool:
    """Send reset link if SMTP is configured. Returns True if sent, False if skipped or failed."""
    if not settings.SMTP_HOST or not settings.FROM_EMAIL:
        logger.info(
            "Password reset email not sent (SMTP not configured). recipient=%s",
            to_email[:3] + "***",
        )
        return False
    msg = EmailMessage()
    msg["Subject"] = "Reset your CreditMind password"
    msg["From"] = settings.FROM_EMAIL
    msg["To"] = to_email
    msg.set_content(
        f"You requested a password reset.\n\n"
        f"Open this link (valid for a limited time):\n{reset_url}\n\n"
        f"If you did not request this, ignore this email."
    )
    try:
        if settings.SMTP_USE_TLS:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as smtp:
                smtp.starttls()
                if settings.SMTP_USER:
                    smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                smtp.send_message(msg)
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as smtp:
                if settings.SMTP_USER:
                    smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                smtp.send_message(msg)
        return True
    except Exception:
        logger.exception("Failed to send password reset email to %s", to_email[:3] + "***")
        return False
