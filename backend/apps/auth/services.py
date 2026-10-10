import threading
import time
from datetime import timedelta

import bcrypt
import jwt
from django.conf import settings
from mongoengine.errors import ValidationError

from apps.shared.documents import now
from apps.shared.errors import AppError
from . import repository
from .schema import member_json

_attempts = {}
_attempt_lock = threading.Lock()


def login(email, password, remote_ip):
    key = (remote_ip, email)
    with _attempt_lock:
        cutoff = time.monotonic() - 300
        for old_key in list(_attempts):
            _attempts[old_key] = [stamp for stamp in _attempts[old_key] if stamp > cutoff]
            if not _attempts[old_key]:
                del _attempts[old_key]
        stamps = _attempts.setdefault(key, [])
        if len(stamps) >= 20:
            raise AppError(429, "RATE_LIMITED", "Too many sign-in attempts. Try again in five minutes.")
        stamps.append(time.monotonic())
    member = repository.by_email(email)
    # Always perform a hash comparison, including unknown users, to limit enumeration.
    encoded = member.password_hash.encode() if member else bcrypt.hashpw(b"invalid-login", bcrypt.gensalt(rounds=10))
    if not bcrypt.checkpw(password.encode(), encoded):
        raise AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.")
    if member is None:
        raise AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.")
    with _attempt_lock:
        _attempts.pop(key, None)
    token = jwt.encode({"sub": str(member.id), "ver": member.token_version, "iat": now(),
                        "exp": now() + timedelta(hours=settings.JWT_EXPIRES_HOURS),
                        "iss": settings.JWT_ISSUER, "aud": settings.JWT_AUDIENCE}, settings.JWT_SECRET, algorithm="HS256")
    return {"token": token, "user": member_json(member)}


def authenticate(token):
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"], issuer=settings.JWT_ISSUER,
                             audience=settings.JWT_AUDIENCE, options={"require": ["sub", "exp", "iat", "ver"]})
        member = repository.by_id(payload["sub"])
    except (jwt.PyJWTError, ValueError, ValidationError):
        raise AppError(401, "INVALID_SESSION", "Your session has expired. Sign in again.")
    if member is None or payload["ver"] != member.token_version:
        raise AppError(401, "INVALID_SESSION", "Your session has expired. Sign in again.")
    return member


def logout(member):
    repository.revoke(member)
