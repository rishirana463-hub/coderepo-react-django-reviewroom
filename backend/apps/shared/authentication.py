import functools

from apps.auth.services import authenticate
from .errors import AppError


def require_auth(view):
    @functools.wraps(view)
    def wrapper(request, *args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            raise AppError(401, "AUTH_REQUIRED", "Sign in to Reviewroom to continue.")
        request.member = authenticate(header[7:].strip())
        if request.method in ("POST", "PATCH", "PUT") and not isinstance(request.data, dict):
            raise AppError(422, "VALIDATION_ERROR", "The request body must be a JSON object.")
        return view(request, *args, **kwargs)
    return wrapper


def require_editor(member):
    if member.role not in ("owner", "editor"):
        raise AppError(403, "FORBIDDEN", "Only owners and editors can change content.")
