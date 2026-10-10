from apps.projects.repository import accessible
from apps.assets.models import Asset
from .models import Activity, Notification, SavedView


def project_ids(member):
    return [project.id for project in accessible(member)]


def add_activity(**fields):
    return Activity(**fields).save()


def upsert_notification(dedupe_key, **fields):
    updates = {f"set_on_insert__{key}": value for key, value in fields.items()}
    result = Notification.objects(dedupe_key=dedupe_key).update_one(upsert=True, full_result=True, **updates)
    return result.upserted_id is not None


def activities(ids, project_id=None, asset_id=None):
    query = Activity.objects(project_id__in=ids)
    if project_id:
        query = query.filter(project_id=project_id)
    if asset_id:
        query = query.filter(asset_id=asset_id)
    return list(query.order_by("-created_at", "-id").limit(100))


def notifications(member_id, ids):
    return list(Notification.objects(member_id=member_id, project_id__in=ids).order_by("-created_at", "-id").limit(100))


def notification(member_id, ids, notification_id):
    return Notification.objects(id=notification_id, member_id=member_id, project_id__in=ids).first()


def save_notification(item):
    return item.save()


def reminder_assets(ids, deadline):
    return list(Asset.objects(project_id__in=ids, status="in_review", due_at__lte=deadline))


def saved_views(member_id):
    return list(SavedView.objects(member_id=member_id).order_by("created_at"))


def saved_view_count(member_id):
    return SavedView.objects(member_id=member_id).count()


def add_saved_view(**fields):
    return SavedView(**fields).save()


def saved_view(member_id, view_id):
    return SavedView.objects(id=view_id, member_id=member_id).first()


def delete_saved_view(view):
    view.delete()


def approval_events(asset_ids, since):
    return list(Activity.objects(asset_id__in=asset_ids, action="review_approved", created_at__gte=since))
