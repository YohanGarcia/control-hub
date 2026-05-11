from datetime import datetime, timezone
from hashlib import sha256
import hmac

from fastapi import HTTPException, status

from app.core.config import settings
from app.core.redis_client import redis_client


def verify_handshake_signature(*, device_id: int, agent_key: str, timestamp: int, nonce: str, signature: str) -> None:
    now = int(datetime.now(timezone.utc).timestamp())
    if abs(now - timestamp) > settings.agent_handshake_max_skew_seconds:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Handshake timestamp out of range")

    expected = hmac.new(
        agent_key.encode("utf-8"),
        f"{device_id}:{timestamp}:{nonce}".encode("utf-8"),
        sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid handshake signature")


def assert_nonce_unused(*, device_id: int, nonce: str) -> None:
    key = f"agent:nonce:{device_id}:{nonce}"
    added = redis_client.set(key, "1", nx=True, ex=settings.agent_handshake_nonce_ttl_seconds)
    if not added:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Handshake nonce replay detected")
