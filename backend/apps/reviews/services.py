from bson import ObjectId

from apps.assets import repository
from apps.assets.models import Comment, Decision, Reply
from apps.assets.schema import expected_revision
from apps.assets.services import detail
from apps.shared.errors import AppError, invalid
from apps.shared.validation import boolean, integer, object_id, text
from .schema import anchor_input


def decide(member, asset_id, data):
    asset, project = repository.get(member, asset_id, writable=True)
    revision = expected_revision(data, asset)
    version = integer(data.get("version"), "version", 1)
    if version != asset.versions[-1].number:
        raise AppError(409, "STALE_VERSION", "Decisions must refer to the current version.")
    if asset.status != "in_review":
        raise AppError(409, "INVALID_TRANSITION", "This version is not awaiting a review decision.")
    stage = asset.stages[asset.current_stage]
    if member.id not in stage.reviewer_ids or member.id == asset.owner_id:
        raise AppError(403, "FORBIDDEN", "Only assigned reviewers in the active stage may decide.")
    if any(item.version == version and item.stage_index == asset.current_stage and item.reviewer_id == member.id for item in asset.decisions):
        raise AppError(409, "ALREADY_DECIDED", "You have already decided on this version and stage.")
    decision = text(data, "decision", 30, required=True)
    if decision not in ("approve", "changes_requested"):
        invalid("decision", "Choose approve or changes_requested.")
    note = text(data, "note", 2000, required=decision == "changes_requested")
    asset.decisions.append(Decision(version=version, stage_index=asset.current_stage, reviewer_id=member.id, decision=decision, note=note))
    stage_advanced = False
    if decision == "changes_requested":
        asset.status = "changes_requested"
    else:
        approvals = sum(item.version == version and item.stage_index == asset.current_stage and item.decision == "approve" for item in asset.decisions)
        if approvals >= stage.quorum:
            if asset.current_stage + 1 < len(asset.stages):
                asset.current_stage += 1
                stage_advanced = True
            else:
                from apps.shared.documents import now
                asset.status = "approved"
                asset.approved_at = now()
    repository.persist(asset, revision)
    from apps.insights.services import notify, notify_stage, record
    action = "changes_requested" if decision == "changes_requested" else "review_approved"
    record(member, project, action, f"{'requested changes to' if decision == 'changes_requested' else 'approved'} version {version} of {asset.title}", asset)
    notify(asset.owner_id, project.id, asset, "Changes requested" if decision == "changes_requested" else "Review approved",
           f"{member.name} reviewed {asset.title}.", f"decision:{asset.id}:{version}:{asset.revision}:{member.id}")
    if stage_advanced:
        notify_stage(asset, project)
    return detail(member, asset_id)


def mutate_comment(member, asset_id, mutation, description):
    # Comments do not require a client revision. Retry their CAS so two independent
    # comments cannot overwrite each other or race a version/approval mutation.
    for attempt in range(3):
        asset, project = repository.get(member, asset_id, writable=True)
        revision = asset.revision
        mutation(asset)
        try:
            repository.persist(asset, revision)
        except AppError as exc:
            if exc.code == "REVISION_CONFLICT" and attempt < 2:
                continue
            raise
        from apps.insights.services import record
        record(member, project, "feedback_updated", description, asset)
        return detail(member, asset_id)


def add_comment(member, asset_id, data):
    body = text(data, "body", 4000, required=True)
    number = integer(data.get("version"), "version", 1)
    comment_id = ObjectId()
    def mutation(asset):
        if len(asset.comments) >= 200:
            raise AppError(409, "COMMENT_LIMIT", "This asset has reached its 200-thread limit.")
        version = next((item for item in asset.versions if item.number == number), None)
        if version is None:
            invalid("version", "This version does not exist.")
        anchor = anchor_input(data, asset, version)
        asset.comments.append(Comment(id=comment_id, version=number, author_id=member.id, body=body, anchor=anchor))
    result = mutate_comment(member, asset_id, mutation, f"commented on version {number}")
    from apps.insights.services import notify
    if result["owner"]["id"] != str(member.id):
        notify(object_id(result["owner"]["id"]), object_id(result["projectId"]), None, "New feedback", f"{member.name} commented on {result['title']}.",
               f"comment:{comment_id}", asset_id=object_id(asset_id))
    return result


def find_comment(asset, comment_id):
    match_id = object_id(comment_id, "commentId")
    comment = next((item for item in asset.comments if item.id == match_id), None)
    if comment is None:
        raise AppError(404, "NOT_FOUND", "Feedback thread not found.")
    return comment


def reply(member, asset_id, comment_id, data):
    body = text(data, "body", 4000, required=True)
    reply_id = ObjectId()
    def mutation(asset):
        comment = find_comment(asset, comment_id)
        if len(comment.replies) >= 50:
            raise AppError(409, "REPLY_LIMIT", "This thread has reached its 50-reply limit.")
        comment.replies.append(Reply(id=reply_id, author_id=member.id, body=body))
    return mutate_comment(member, asset_id, mutation, "replied to a feedback thread")


def resolve(member, asset_id, comment_id, data):
    resolved = boolean(data, "resolved")
    def mutation(asset):
        comment = find_comment(asset, comment_id)
        if member.role == "reviewer" and comment.author_id != member.id:
            raise AppError(403, "FORBIDDEN", "Only the thread author or an editor can resolve feedback.")
        comment.resolved = resolved
    return mutate_comment(member, asset_id, mutation, "resolved feedback" if resolved else "reopened feedback")
