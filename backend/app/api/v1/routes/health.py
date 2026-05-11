from fastapi import APIRouter, Response, status
from sqlalchemy import text

from app.core.redis_client import redis_client
from app.db.session import SessionLocal


router = APIRouter()


@router.get("/health")
def health_check() -> dict[str, str]:
    db_ok = "down"
    redis_ok = "down"

    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        db_ok = "up"
    finally:
        db.close()

    if redis_client.ping():
        redis_ok = "up"

    status = "ok" if db_ok == "up" and redis_ok == "up" else "degraded"
    return {"status": status, "database": db_ok, "redis": redis_ok}


@router.get("/health/live")
def health_live() -> dict[str, str]:
    return {"status": "alive"}


@router.get("/health/ready")
def health_ready(response: Response) -> dict[str, str]:
    checks = health_check()
    if checks["status"] != "ok":
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return checks
