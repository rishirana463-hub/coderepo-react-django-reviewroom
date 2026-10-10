from datetime import datetime, timezone

from bson import ObjectId

from .errors import invalid

MEDIA_PATHS = {f"/media/{name}.svg" for name in ("summer", "botanical", "studio", "launch", "editorial", "social")}


def object_id(value, field="id"):
    if not isinstance(value, str) or not ObjectId.is_valid(value):
        invalid(field, "A valid record ID is required.")
    return ObjectId(value)


def text(data, key, maximum=200, required=False, default=""):
    if not isinstance(data, dict):
        invalid("body", "The request body must be a JSON object.")
    value = data.get(key, default)
    if not isinstance(value, str):
        invalid(key, "Use a text value.")
    value = value.strip()
    if required and not value:
        invalid(key, "This field is required.")
    if len(value) > maximum:
        invalid(key, f"Use no more than {maximum} characters.")
    return value


def integer(value, field, minimum=0, maximum=100000):
    if isinstance(value, bool):
        invalid(field, "Use a whole number.")
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        invalid(field, "Use a whole number.")
    if str(parsed) != str(value) or not minimum <= parsed <= maximum:
        invalid(field, f"Use a whole number between {minimum} and {maximum}.")
    return parsed


def date(value, field="dueAt"):
    if value in (None, ""):
        return None
    if not isinstance(value, str):
        invalid(field, "Use an ISO 8601 date.")
    try:
        result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        invalid(field, "Use an ISO 8601 date.")
    if result.tzinfo is None:
        result = result.replace(tzinfo=timezone.utc)
    return result.astimezone(timezone.utc)


def string_list(data, key, maximum=10):
    values = data.get(key, [])
    if not isinstance(values, list) or len(values) > maximum:
        invalid(key, f"Use a list with no more than {maximum} values.")
    if any(not isinstance(value, str) or not value.strip() or len(value) > 40 for value in values):
        invalid(key, "List values must contain 1 to 40 characters.")
    return list(dict.fromkeys(value.strip() for value in values))


def media_path(data):
    path = text(data, "mediaPath", 100)
    if path and path not in MEDIA_PATHS:
        invalid("mediaPath", "Choose a bundled visual asset.")
    return path


def boolean(data, key):
    value = data.get(key)
    if not isinstance(value, bool):
        invalid(key, "Use true or false.")
    return value
