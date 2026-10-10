from .models import Member


def by_email(email):
    return Member.objects(email=email).first()


def by_id(member_id):
    return Member.objects(id=member_id).first()


def all_members():
    return list(Member.objects.order_by("name"))


def members_by_ids(ids):
    return list(Member.objects(id__in=ids))


def count_ids(ids):
    return Member.objects(id__in=ids).count()


def revoke(member):
    member.update(inc__token_version=1)
