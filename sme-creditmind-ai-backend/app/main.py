from datetime import datetime

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import text

from app.api import (
    ai_chat,
    auth,
    credit_scores,
    dashboard,
    financial_documents,
    loan_cases,
    merchants,
    reports,
    subscription,
    transactions,
)
from app.bootstrap import ensure_demo_tenant, ensure_subscription_plans
from app.config import settings
from app.database import SessionLocal, create_tables, engine
from app.limiter import limiter
from app.services.pos_orchestrator import get_provider_health

app = FastAPI(title=settings.APP_NAME, version="2.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

_cors_kwargs = dict(
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
if settings.CORS_ALLOW_LOCAL_REGEX:
    _cors_kwargs["allow_origin_regex"] = r"https?://(localhost|127\.0\.0\.1)(:\d+)?"
app.add_middleware(CORSMiddleware, **_cors_kwargs)

app.include_router(auth.router)
app.include_router(merchants.router)
app.include_router(credit_scores.router)
app.include_router(dashboard.router)
app.include_router(transactions.router)
app.include_router(ai_chat.router)
app.include_router(financial_documents.router)
app.include_router(reports.router)
app.include_router(subscription.router)
app.include_router(loan_cases.router)


@app.on_event("startup")
def on_startup():
    create_tables()
    db = SessionLocal()
    try:
        ensure_subscription_plans(db)
        ensure_demo_tenant(db)
    finally:
        db.close()


@app.get("/api/health")
def health(verbose: bool = Query(default=True)):
    db_health = _check_database_health()
    ai_health = _check_ai_health(include_details=verbose)

    overall_status = "ok"
    if not db_health["healthy"]:
        overall_status = "degraded"
    elif ai_health["status"] == "unhealthy":
        overall_status = "degraded"

    return {
        "status": overall_status,
        "service": settings.APP_NAME,
        "version": "2.0.0",
        "checkedAt": datetime.utcnow().isoformat() + "Z",
        "database": db_health,
        "aiProviders": ai_health,
    }


def _check_database_health():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"healthy": True, "message": "Database connection OK"}
    except Exception as exc:  # noqa: BLE001
        return {"healthy": False, "message": f"Database health check failed: {exc}"}


def _check_ai_health(include_details: bool = True):
    try:
        providers = get_provider_health()
    except Exception as exc:  # noqa: BLE001
        payload = {
            "status": "unhealthy",
            "healthyCount": 0,
            "configuredCount": 0,
            "total": 0,
            "message": f"AI provider health check failed: {exc}",
        }
        if include_details:
            payload["providers"] = []
        return payload

    healthy_count = sum(1 for item in providers if item.get("healthy"))
    configured_count = sum(1 for item in providers if item.get("configured"))

    if configured_count == 0:
        status = "not_configured"
    elif healthy_count > 0:
        status = "healthy"
    else:
        status = "unhealthy"

    payload = {
        "status": status,
        "healthyCount": healthy_count,
        "configuredCount": configured_count,
        "total": len(providers),
    }
    if include_details:
        payload["providers"] = providers
    return payload
