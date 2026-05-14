from datetime import datetime, timedelta, timezone
from hashlib import sha256
from secrets import token_urlsafe
from uuid import uuid4

import jwt
from passlib.context import CryptContext

from app.core.config import settings


pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_access_token(subject: str) -> tuple[str, datetime]:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": subject,
        "type": "access",
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "iat": now,
        "nbf": now,
        "jti": str(uuid4()),
        "exp": expire,
    }
    encoded = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return encoded, expire


def create_refresh_token() -> str:
    return token_urlsafe(48)


def hash_refresh_token(raw_token: str) -> str:
    return sha256(raw_token.encode("utf-8")).hexdigest()
