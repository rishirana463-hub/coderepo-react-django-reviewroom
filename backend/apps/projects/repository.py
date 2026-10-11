from apps.shared.errors import AppError
from apps.shared.validation import object_id
from .models import Project


def accessible(member, include_archived=True):
    query = Project.objects
    if member.role != "owner":
        query = query.filter(member_ids=member.id)
    return query if include_archived else query.filter(archived=False)


def get(member, project_id, writable=False):
    project = accessible(member).filter(id=object_id(project_id, "projectId")).first()
    if project is None:
        raise AppError(404, "NOT_FOUND", "Project not found.")
    if writable and project.archived:
        raise AppError(409, "PROJECT_ARCHIVED", "Restore this project before changing its content.")
    return project


def create(fields):
    return Project(**fields).save()


def save(project):
    return project.save()


def active_reviewers(project):
    from apps.assets.models import Asset
    return {reviewer for asset in Asset.objects(project_id=project.id, status="in_review")
            for stage in asset.stages for reviewer in stage.reviewer_ids}


def asset_counts(project_ids):
    from apps.assets.models import Asset
    if not project_ids:
        return {}
    rows = Asset.objects(project_id__in=project_ids).aggregate({"$group": {
        "_id": "$project_id", "total": {"$sum": 1},
        "approved": {"$sum": {"$cond": [{"$eq": ["$status", "approved"]}, 1, 0]}},
    }})
    return {row["_id"]: (row["total"], row["approved"]) for row in rows}
