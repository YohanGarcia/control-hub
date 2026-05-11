from fastapi import HTTPException, status

from app.core.config import settings
from app.core.redis_client import redis_client


def enforce_auth_rate_limit(client_ip: str, route: str) -> None:
    key = f"rl:auth:{route}:{client_ip}"
    count = redis_client.incr(key)
    if count == 1:
        redis_client.expire(key, settings.auth_rate_limit_window_seconds)

    if count > settings.auth_rate_limit_max_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Try again later.",
        )


def _failure_key(client_ip: str, email: str) -> str:
    return f"auth:fail:{email.lower()}:{client_ip}"


def _lock_key(client_ip: str, email: str) -> str:
    return f"auth:lock:{email.lower()}:{client_ip}"


def enforce_login_lockout(client_ip: str, email: str) -> None:
    ttl = redis_client.ttl(_lock_key(client_ip, email))
    if ttl and ttl > 0:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Account temporarily locked. Retry in {ttl} seconds.",
        )


def register_login_failure(client_ip: str, email: str) -> tuple[int, int]:
    fail_key = _failure_key(client_ip, email)
    failures = redis_client.incr(fail_key)
    if failures == 1:
        redis_client.expire(fail_key, settings.auth_lockout_window_seconds)

    penalty = 0
    if failures >= 3:
        penalty = min(
            settings.auth_lockout_max_seconds,
            settings.auth_lockout_base_seconds * (2 ** (failures - 3)),
        )
        redis_client.setex(_lock_key(client_ip, email), penalty, "1")
    return failures, penalty


def clear_login_failures(client_ip: str, email: str) -> None:
    redis_client.delete(_failure_key(client_ip, email))
    redis_client.delete(_lock_key(client_ip, email))
