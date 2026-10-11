import re

from mongoengine.queryset.visitor import Q

from apps.projects import repository as projects
from apps.shared.documents import now
from apps.shared.errors import AppError, invalid
from apps.shared.validation import integer, object_id
from .models import Asset, STATUSES


def get(member, asset_id, writable=False):
    asset = Asset.objects(id=object_id(asset_id, "assetId")).first()
    if asset is None:
        raise AppError(404, "NOT_FOUND", "Asset not found.")
    project = projects.get(member, str(asset.project_id), writable=writable)
    return asset, project


def filtered(member, params, visible_projects=None):
    project_ids = [project.id for project in (visible_projects if visible_projects is not None else projects.accessible(member))]
    query = Asset.objects(project_id__in=project_ids)
    if params.get("projectId"):
        project = projects.get(member, params["projectId"])
        query = query.filter(project_id=project.id)
    if params.get("status"):
        if params["status"] not in STATUSES:
            invalid("status", "Choose a valid asset status.")
        query = query.filter(status=params["status"])
    if params.get("q"):
        term = params["q"]
        if not isinstance(term, str) or len(term) > 200:
            invalid("q", "Search must contain no more than 200 characters.")
        pattern = re.compile(re.escape(term), re.IGNORECASE)
        query = query.filter(Q(title=pattern) | Q(tags=pattern))
    if params.get("assigneeId"):
        reviewer = object_id(params["assigneeId"], "assigneeId")
        query = query.filter(stages__reviewer_ids=reviewer)
    if str(params.get("overdue", "false")).lower() == "true":
        query = query.filter(due_at__lt=now(), status__in=["in_review", "changes_requested"])
    sort = params.get("sort", "updated")
    sorts = {"updated": ("-updated_at", "id"), "due": ("due_at", "id"), "title": ("title", "id")}
    if sort not in sorts:
        invalid("sort", "Choose updated, due, or title sorting.")
    return query.order_by(*sorts[sort])


def pagination(params):
    return integer(params.get("page", 1), "page", 1, 100000), integer(params.get("pageSize", 24), "pageSize", 1, 100)


def persist(asset, expected_revision):
    """One document CAS makes versions, decisions, stage state and comments atomic."""
    asset.revision = expected_revision + 1
    asset.updated_at = now()
    asset.validate()
    result = Asset._get_collection().replace_one({"_id": asset.id, "revision": expected_revision}, asset.to_mongo())
    if result.matched_count != 1:
        raise AppError(409, "REVISION_CONFLICT", "This asset changed. Refresh it before trying again.")
    return asset


def create(**fields):
    return Asset(**fields).save()


def project_map(query):
    from apps.projects.models import Project
    return {str(project.id): project for project in Project.objects(id__in=query.distinct("project_id"))}
