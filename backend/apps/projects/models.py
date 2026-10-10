from mongoengine import BooleanField, ListField, ObjectIdField, StringField

from apps.shared.documents import TimestampedDocument


class Project(TimestampedDocument):
    meta = {"collection": "projects", "indexes": ["member_ids", "archived"]}
    name = StringField(required=True, max_length=100)
    description = StringField(default="", max_length=2000)
    color = StringField(default="#94a991", regex=r"^#[0-9a-fA-F]{6}$")
    member_ids = ListField(ObjectIdField(), default=list)
    archived = BooleanField(default=False)
