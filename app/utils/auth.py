"""
JWT authentication helpers.

In production, replace the in-memory user store with a database.
This module is intentionally framework-agnostic so it works with both
the FastAPI backend and the Streamlit session state.
"""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from app.config import settings

# ── password hashing ──────────────────────────────────────────────────────────

_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return _pwd_ctx.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd_ctx.verify(plain, hashed)


# ── token models ──────────────────────────────────────────────────────────────

class TokenData(BaseModel):
    username: str
    expires: datetime


class UserOut(BaseModel):
    username: str
    email: str


# ── simple in-memory user DB (swap for real DB in production) ─────────────────

_USERS: dict[str, dict] = {
    "demo": {
        "username": "demo",
        "email": "demo@example.com",
        "hashed_password": hash_password("demo1234"),
    }
}


def get_user(username: str) -> Optional[dict]:
    return _USERS.get(username)


def register_user(username: str, email: str, password: str) -> bool:
    if username in _USERS:
        return False
    _USERS[username] = {
        "username": username,
        "email": email,
        "hashed_password": hash_password(password),
    }
    return True


def authenticate_user(username: str, password: str) -> Optional[dict]:
    user = get_user(username)
    if not user:
        return None
    if not verify_password(password, user["hashed_password"]):
        return None
    return user


# ── token creation / verification ─────────────────────────────────────────────

def create_access_token(username: str) -> str:
    expire = datetime.now(tz=timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload = {"sub": username, "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> Optional[TokenData]:
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.algorithm]
        )
        username: str = payload.get("sub", "")
        exp = payload.get("exp")
        if not username or not exp:
            return None
        return TokenData(
            username=username,
            expires=datetime.fromtimestamp(exp, tz=timezone.utc),
        )
    except JWTError:
        return None
