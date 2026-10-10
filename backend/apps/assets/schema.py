from apps.auth import repository as people
from apps.auth.schema import member_json
from apps.shared.documents import iso
from apps.shared.errors import AppError, invalid
from apps.shared.validation import integer, object_id, text
from .models import Stage


def stage_input(data, project, owner_id):
    values = data.get("stages", [])
    if not isinstance(values, list) or len(values) > 5:
        invalid("stages", "Choose up to five review stages.")
    stages = []
    for value in values:
        if not isinstance(value, dict):
            invalid("stages", "Each stage must be an object.")
        name = text(value, "name", 100, required=True)
        ids = value.get("reviewerIds", [])
        if not isinstance(ids, list) or not 1 <= len(ids) <= 10:
            invalid("reviewerIds", "Each stage needs 1 to 10 reviewers.")
        ids = list(dict.fromkeys(object_id(item, "reviewerIds") for item in ids))
        if owner_id in ids:
            invalid("reviewerIds", "Content owners cannot approve their own assets.")
        if not set(ids).issubset(set(project.member_ids)):
            invalid("reviewerIds", "All reviewers must belong to this project.")
        if people.count_ids(ids) != len(ids):
            invalid("reviewerIds", "A selected reviewer no longer exists.")
        quorum = integer(value.get("quorum", len(ids)), "quorum", 1, len(ids))
        stages.append(Stage(name=name, reviewer_ids=ids, quorum=quorum))
    return stages


def expected_revision(data, asset):
    revision = integer(data.get("revision"), "revision", 1)
    if revision != asset.revision:
        raise AppError(409, "REVISION_CONFLICT", "This asset changed. Refresh it before trying again.")
    return revision


def members_map():
    return {str(member.id): member for member in people.all_members()}


def asset_json(asset, project, member, detail=False, members=None):
    members = members if members is not None else members_map()
    def person(member_id):
        found = members.get(str(member_id))
        return member_json(found) if found else None
    latest = asset.versions[-1]
    version_number = latest.number
    reviewer_ids = list(dict.fromkeys(str(value) for stage in asset.stages for value in stage.reviewer_ids))
    current_stage = asset.stages[asset.current_stage] if asset.stages and asset.current_stage < len(asset.stages) else None
    decided = any(item.version == version_number and item.stage_index == asset.current_stage and item.reviewer_id == member.id for item in asset.decisions)
    result = {
        "id": str(asset.id), "projectId": str(project.id), "projectName": project.name, "projectColor": project.color,
        "title": asset.title, "type": asset.type, "status": asset.status, "version": version_number, "revision": asset.revision,
        "owner": person(asset.owner_id), "dueAt": iso(asset.due_at), "updatedAt": iso(asset.updated_at), "createdAt": iso(asset.created_at),
        "tags": asset.tags, "thumbnail": latest.media_path, "mediaPath": latest.media_path, "content": latest.content,
        "reviewerIds": reviewer_ids, "currentStage": asset.current_stage,
        "stages": [{"name": stage.name, "reviewerIds": [str(value) for value in stage.reviewer_ids], "quorum": stage.quorum} for stage in asset.stages],
        "commentCount": len(asset.comments), "unresolvedCount": sum(not comment.resolved and comment.version == version_number for comment in asset.comments),
        "canEdit": member.role in ("owner", "editor") and not project.archived,
        "canDecide": bool(not project.archived and asset.status == "in_review" and current_stage and member.id in current_stage.reviewer_ids and not decided),
    }
    if detail:
        result.update({
            "versions": [{"number": version.number, "title": version.title, "content": version.content, "mediaPath": version.media_path,
                          "note": version.note, "author": person(version.author_id), "createdAt": iso(version.created_at)} for version in asset.versions],
            "decisions": [{"version": item.version, "stageIndex": item.stage_index, "reviewerId": str(item.reviewer_id), "reviewer": person(item.reviewer_id),
                           "decision": item.decision, "note": item.note, "createdAt": iso(item.created_at)} for item in asset.decisions],
            "comments": [{"id": str(comment.id), "version": comment.version, "body": comment.body, "author": person(comment.author_id),
                          "anchor": comment.anchor, "stale": comment.version != version_number, "resolved": comment.resolved,
                          "createdAt": iso(comment.created_at), "replies": [{"id": str(reply.id), "body": reply.body, "author": person(reply.author_id),
                          "createdAt": iso(reply.created_at)} for reply in comment.replies]} for comment in asset.comments],
            "submittedAt": iso(asset.submitted_at), "approvedAt": iso(asset.approved_at),
        })
    return result
