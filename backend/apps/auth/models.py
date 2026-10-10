from mongoengine import IntField, StringField

from apps.shared.documents import TimestampedDocument


class Member(TimestampedDocument):
    meta = {"collection": "members", "indexes": [{"fields": ["email"], "unique": True}]}
    name = StringField(required=True, max_length=100)
    email = StringField(required=True, max_length=254)
    password_hash = StringField(required=True)
    role = StringField(choices=("owner", "editor", "reviewer"), required=True)
    color = StringField(default="#7b61a8")
    token_version = IntField(default=0)
