from datetime import datetime, timezone

from mongoengine import DateTimeField, Document


def now():
    return datetime.now(timezone.utc)


def iso(value):
    if value is None:
        return None
    return value.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")


class TimestampedDocument(Document):
    meta = {"abstract": True}
    created_at = DateTimeField(default=now, required=True)
    updated_at = DateTimeField(default=now, required=True)
