from mongoengine import BooleanField, DictField, Document, ObjectIdField, StringField, DateTimeField

from apps.shared.documents import now, TimestampedDocument


class Activity(Document):
    meta = {"collection": "activity", "indexes": [("project_id", "-created_at"), ("asset_id", "-created_at")]}
    project_id = ObjectIdField(required=True)
    asset_id = ObjectIdField(null=True)
    asset_title = StringField(default="")
    actor_id = ObjectIdField(required=True)
    action = StringField(required=True)
    description = StringField(required=True)
    created_at = DateTimeField(default=now)


class Notification(Document):
    meta = {"collection": "notifications", "indexes": [("member_id", "-created_at"), {"fields": ["dedupe_key"], "unique": True}]}
    member_id = ObjectIdField(required=True)
    project_id = ObjectIdField(required=True)
    asset_id = ObjectIdField(null=True)
    title = StringField(required=True)
    body = StringField(default="")
    read = BooleanField(default=False)
    dedupe_key = StringField(required=True)
    created_at = DateTimeField(default=now)


class SavedView(TimestampedDocument):
    meta = {"collection": "saved_views", "indexes": ["member_id"]}
    member_id = ObjectIdField(required=True)
    name = StringField(required=True, max_length=100)
    filters = DictField(default=dict)
