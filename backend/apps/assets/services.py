from apps.projects import repository as projects
from apps.shared.authentication import require_editor
from apps.shared.documents import now
from apps.shared.errors import AppError, invalid
from apps.shared.validation import date, media_path, string_list, text
from . import repository
from .models import Version
from .schema import asset_json, expected_revision, stage_input


def detail(member, asset_id):
    asset, project = repository.get(member, asset_id)
    result = asset_json(asset, project, member, detail=True)
    from apps.insights.services import activity
    result["activity"] = activity(member, asset_id=asset_id)
    return result


def create(member, data):
    require_editor(member)
    project = projects.get(member, text(data, "projectId", 24, required=True), writable=True)
    title = text(data, "title", 200, required=True)
    kind = text(data, "type", 10, default="copy")
    if kind not in ("copy", "image"):
        invalid("type", "Choose copy or image.")
    content = text(data, "content", 20000)
    media = media_path(data)
    if kind == "image" and not media:
        invalid("mediaPath", "Select a visual for this image asset.")
    asset = repository.create(project_id=project.id, owner_id=member.id, title=title, type=kind,
                  tags=string_list(data, "tags"), due_at=date(data.get("dueAt")),
                  stages=stage_input(data, project, member.id),
                  versions=[Version(number=1, title=title, content=content, media_path=media, author_id=member.id)])
    from apps.insights.services import record
    record(member, project, "asset_created", f"created {title}", asset)
    return detail(member, str(asset.id))


def update(member, asset_id, data):
    require_editor(member)
    asset, project = repository.get(member, asset_id, writable=True)
    revision = expected_revision(data, asset)
    # Version content and title are immutable; title edits create a new version.
    if "title" in data and data["title"] != asset.title:
        invalid("title", "Create a new version to change the asset title.")
    if "tags" in data:
        asset.tags = string_list(data, "tags")
    if "dueAt" in data:
        asset.due_at = date(data["dueAt"])
    if "stages" in data:
        if asset.status != "draft":
            raise AppError(409, "WORKFLOW_LOCKED", "Create a new version before changing a submitted workflow.")
        asset.stages = stage_input(data, project, asset.owner_id)
    repository.persist(asset, revision)
    from apps.insights.services import record
    record(member, project, "asset_updated", f"updated review settings for {asset.title}", asset)
    return detail(member, asset_id)


def add_version(member, asset_id, data):
    require_editor(member)
    asset, project = repository.get(member, asset_id, writable=True)
    revision = expected_revision(data, asset)
    if len(asset.versions) >= 100:
        raise AppError(409, "VERSION_LIMIT", "This asset has reached its 100-version limit.")
    previous = asset.versions[-1]
    title = text(data, "title", 200, required=True, default=asset.title)
    content = text(data, "content", 20000, default=previous.content)
    media = media_path(data) if "mediaPath" in data else previous.media_path
    if asset.type == "image" and not media:
        invalid("mediaPath", "Select a visual for this image asset.")
    asset.versions.append(Version(number=previous.number + 1, title=title, content=content, media_path=media,
                                  note=text(data, "note", 1000), author_id=member.id))
    asset.title = title
    asset.status = "draft"
    asset.current_stage = 0
    asset.submitted_at = None
    asset.approved_at = None
    repository.persist(asset, revision)
    from apps.insights.services import record
    record(member, project, "version_created", f"created version {previous.number + 1} of {title}; prior decisions remain in history", asset)
    return detail(member, asset_id)


def submit(member, asset_id, data):
    require_editor(member)
    asset, project = repository.get(member, asset_id, writable=True)
    revision = expected_revision(data, asset)
    if asset.status != "draft":
        raise AppError(409, "INVALID_TRANSITION", "Only draft versions can be submitted for review.")
    if not asset.stages:
        invalid("stages", "Add at least one review stage before submitting.")
    # Revalidate memberships at submission, including changes since the draft was made.
    stage_input({"stages": [{"name": stage.name, "reviewerIds": [str(value) for value in stage.reviewer_ids], "quorum": stage.quorum} for stage in asset.stages]}, project, asset.owner_id)
    asset.status = "in_review"
    asset.current_stage = 0
    asset.submitted_at = now()
    repository.persist(asset, revision)
    from apps.insights.services import notify_stage, record
    record(member, project, "review_submitted", f"submitted version {asset.versions[-1].number} of {asset.title}", asset)
    notify_stage(asset, project)
    return detail(member, asset_id)


def export_manifest(member, asset_id):
    asset, project = repository.get(member, asset_id)
    if asset.status != "approved":
        raise AppError(409, "APPROVAL_REQUIRED", "Only the current approved version can be exported.")
    latest = asset.versions[-1]
    result = asset_json(asset, project, member, detail=True)
    return {"product": "Reviewroom", "exportedAt": now().isoformat(), "assetId": str(asset.id), "project": project.name,
            "version": latest.number, "title": latest.title, "content": latest.content, "mediaPath": latest.media_path,
            "approvedAt": result["approvedAt"], "stages": result["stages"],
            "decisions": [decision for decision in result["decisions"] if decision["version"] == latest.number]}
