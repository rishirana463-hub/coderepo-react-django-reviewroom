from mongoengine.connection import get_db
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .errors import AppError


@api_view(["GET"])
def health(request):
    try:
        get_db().command("ping")
        return Response({"data": {"status": "ok", "database": "connected"}})
    except Exception:
        return Response({"data": {"status": "degraded", "database": "disconnected"}}, status=503)


@api_view(["GET", "POST", "PATCH", "DELETE", "PUT"])
def not_found(request, **kwargs):
    raise AppError(404, "NOT_FOUND", "This route does not exist.")
