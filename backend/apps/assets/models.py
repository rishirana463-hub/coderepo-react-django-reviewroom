from mongoengine import (
    BooleanField, DateTimeField, DictField, EmbeddedDocument, EmbeddedDocumentListField,
    IntField, ListField, ObjectIdField, StringField,
)

from apps.shared.documents import TimestampedDocument, now

STATUSES = ("draft", "in_review", "changes_requested", "approved")


class Version(EmbeddedDocument):
    number = IntField(required=True, min_value=1)
    title = StringField(required=True, max_length=200)
    content = StringField(default="", max_length=20000)
    media_path = StringField(default="")
    note = StringField(default="", max_length=1000)
    author_id = ObjectIdField(required=True)
    created_at = DateTimeField(default=now)


class Stage(EmbeddedDocument):
    name = StringField(required=True, max_length=100)
    reviewer_ids = ListField(ObjectIdField(), required=True)
    quorum = IntField(required=True, min_value=1)


class Decision(EmbeddedDocument):
    version = IntField(required=True)
    stage_index = IntField(required=True)
    reviewer_id = ObjectIdField(required=True)
    decision = StringField(choices=("approve", "changes_requested"), required=True)
    note = StringField(default="", max_length=2000)
    created_at = DateTimeField(default=now)


class Reply(EmbeddedDocument):
    id = ObjectIdField(required=True)
    author_id = ObjectIdField(required=True)
    body = StringField(required=True, max_length=4000)
    created_at = DateTimeField(default=now)


class Comment(EmbeddedDocument):
    id = ObjectIdField(required=True)
    version = IntField(required=True)
    author_id = ObjectIdField(required=True)
    body = StringField(required=True, max_length=4000)
    anchor = DictField(default=dict)
    replies = EmbeddedDocumentListField(Reply, default=list)
    resolved = BooleanField(default=False)
    created_at = DateTimeField(default=now)


class Asset(TimestampedDocument):
    meta = {"collection": "assets", "indexes": [("project_id", "status", "-updated_at"), "due_at", "owner_id", "stages.reviewer_ids"]}
    project_id = ObjectIdField(required=True)
    owner_id = ObjectIdField(required=True)
    title = StringField(required=True, max_length=200)
    type = StringField(choices=("copy", "image"), required=True)
    status = StringField(choices=STATUSES, default="draft")
    tags = ListField(StringField(max_length=40), default=list)
    due_at = DateTimeField(null=True)
    revision = IntField(default=1)
    current_stage = IntField(default=0)
    versions = EmbeddedDocumentListField(Version, default=list)
    stages = EmbeddedDocumentListField(Stage, default=list)
    decisions = EmbeddedDocumentListField(Decision, default=list)
    comments = EmbeddedDocumentListField(Comment, default=list)
    submitted_at = DateTimeField(null=True)
    approved_at = DateTimeField(null=True)
