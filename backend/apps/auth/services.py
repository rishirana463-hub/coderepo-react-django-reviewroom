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
_attempt_window = 300
_email_attempt_limit = 20
_ip_attempt_limit = 100
_max_attempt_buckets = 4096
# This random dummy hash is not a credential. Generate it once at the same cost
# as seeded accounts so unknown emails do not take a cheaper verification path.
_dummy_hash = bcrypt.hashpw(b"unknown-account-placeholder", bcrypt.gensalt(rounds=12))


def record_attempt(email, remote_ip):
    email_key = ("email", remote_ip, email)
    ip_key = ("ip", remote_ip)
    with _attempt_lock:
        timestamp = time.monotonic()
        cutoff = timestamp - _attempt_window
        for old_key in list(_attempts):
            _attempts[old_key] = [stamp for stamp in _attempts[old_key] if stamp > cutoff]
            if not _attempts[old_key]:
                del _attempts[old_key]
        new_keys = sum(key not in _attempts for key in (email_key, ip_key))
        # Fail closed at the cap instead of evicting active buckets and letting
        # rotating IPs or emails bypass the limits or grow per-worker memory.
        if (len(_attempts) + new_keys > _max_attempt_buckets
                or len(_attempts.get(email_key, [])) >= _email_attempt_limit
                or len(_attempts.get(ip_key, [])) >= _ip_attempt_limit):
            raise AppError(429, "RATE_LIMITED", "Too many sign-in attempts. Try again in five minutes.")
        for key in (email_key, ip_key):
            _attempts.setdefault(key, []).append(timestamp)
    return email_key


def login(email, password, remote_ip):
    key = record_attempt(email, remote_ip)
    member = repository.by_email(email)
    # Always perform a hash comparison, including unknown users, to limit enumeration.
    encoded = member.password_hash.encode() if member else _dummy_hash
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
        if len(token) > 4096:
            raise ValueError("Session token is too long.")
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"], issuer=settings.JWT_ISSUER,
                             audience=settings.JWT_AUDIENCE, options={"require": ["sub", "exp", "iat", "ver"]})
        member = repository.by_id(payload["sub"])
    except (jwt.PyJWTError, ValueError, ValidationError, RecursionError):
        raise AppError(401, "INVALID_SESSION", "Your session has expired. Sign in again.")
    if member is None or payload["ver"] != member.token_version:
        raise AppError(401, "INVALID_SESSION", "Your session has expired. Sign in again.")
    return member


def logout(member):
    repository.revoke(member)
