from apps.auth.schema import member_json
from apps.shared.documents import iso


def activity_json(event, members):
    actor = members.get(str(event.actor_id))
    return {"id": str(event.id), "action": event.action, "description": event.description,
            "actor": member_json(actor) if actor else None, "assetId": str(event.asset_id) if event.asset_id else None,
            "assetTitle": event.asset_title, "projectId": str(event.project_id), "createdAt": iso(event.created_at)}


def notification_json(item):
    return {"id": str(item.id), "title": item.title, "body": item.body, "assetId": str(item.asset_id) if item.asset_id else None,
            "projectId": str(item.project_id), "read": item.read, "createdAt": iso(item.created_at)}


def saved_view_json(view):
    return {"id": str(view.id), "name": view.name, "filters": view.filters}
