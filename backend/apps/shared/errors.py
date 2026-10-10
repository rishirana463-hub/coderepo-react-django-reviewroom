import logging

from mongoengine.errors import NotUniqueError, ValidationError as MongoValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


class AppError(Exception):
    def __init__(self, status, code, message, details=None):
        self.status = status
        self.code = code
        self.message = message
        self.details = details
        super().__init__(message)


def invalid(field, message):
    raise AppError(422, "VALIDATION_ERROR", message, {"fieldErrors": {field: [message]}})


def api_exception_handler(exc, context):
    if isinstance(exc, (MongoValidationError, ValueError)):
        exc = AppError(422, "VALIDATION_ERROR", "The request contains an invalid value.")
    if isinstance(exc, NotUniqueError):
        exc = AppError(409, "CONFLICT", "This record already exists.")
    if isinstance(exc, AppError):
        error = {"code": exc.code, "message": exc.message}
        if exc.details is not None:
            error["details"] = exc.details
        return Response({"error": error}, status=exc.status)
    response = exception_handler(exc, context)
    if response is not None:
        return Response({"error": {"code": "INVALID_REQUEST", "message": str(response.data.get("detail", "The request is invalid."))}}, status=response.status_code)
    logger.exception("Unhandled API error", exc_info=exc)
    return Response({"error": {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred."}}, status=500)
