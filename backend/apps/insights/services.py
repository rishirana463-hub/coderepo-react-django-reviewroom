import csv
import io
from collections import Counter, defaultdict
from datetime import timedelta, timezone

from apps.assets import repository as assets
from apps.auth import repository as people
from apps.auth.schema import member_json
from apps.projects import repository as projects
from apps.shared.documents import iso, now
from apps.shared.errors import AppError, invalid
from apps.shared.validation import boolean, object_id, text
from . import repository
from .repository import project_ids
from .schema import activity_json, notification_json, saved_view_json


def record(member, project, action, description, asset=None):
    return repository.add_activity(project_id=project.id, asset_id=asset.id if asset else None, asset_title=asset.title if asset else "",
                                   actor_id=member.id, action=action, description=description)


def notify(member_id, project_id, asset, title, body, dedupe_key, asset_id=None):
    # Atomic unique upsert protects reminders and retryable notifications.
    return repository.upsert_notification(dedupe_key, member_id=member_id, project_id=project_id, asset_id=asset.id if asset else asset_id,
                                         title=title, body=body, read=False, created_at=now())


def notify_stage(asset, project):
    stage = asset.stages[asset.current_stage]
    for reviewer_id in stage.reviewer_ids:
        notify(reviewer_id, project.id, asset, "Your review is ready", f"{asset.title} · {stage.name}",
               f"assigned:{asset.id}:{asset.versions[-1].number}:{asset.current_stage}:{reviewer_id}")


def activity(member, project_id=None, asset_id=None):
    selected_project = projects.get(member, project_id).id if project_id else None
    selected_asset = assets.get(member, asset_id)[0].id if asset_id else None
    members = {str(person.id): person for person in people.all_members()}
    return [activity_json(event, members) for event in repository.activities(project_ids(member), selected_project, selected_asset)]


def inbox(member):
    return [notification_json(item) for item in repository.notifications(member.id, project_ids(member))]


def read_notification(member, notification_id, data):
    item = repository.notification(member.id, project_ids(member), object_id(notification_id))
    if item is None:
        raise AppError(404, "NOT_FOUND", "Notification not found.")
    item.read = boolean(data, "read")
    repository.save_notification(item)
    return notification_json(item)


def reminders(member):
    if member.role != "owner":
        raise AppError(403, "FORBIDDEN", "Only owners can process deadline reminders.")
    created = 0
    for asset in repository.reminder_assets([project.id for project in projects.accessible(member, include_archived=False)], now() + timedelta(days=1)):
        if not asset.due_at or not asset.stages:
            continue
        version = asset.versions[-1].number
        decided = {item.reviewer_id for item in asset.decisions if item.version == version and item.stage_index == asset.current_stage}
        overdue = asset.due_at.replace(tzinfo=timezone.utc) < now()
        bucket = "overdue" if overdue else "due-soon"
        for reviewer_id in asset.stages[asset.current_stage].reviewer_ids:
            if reviewer_id not in decided:
                created += notify(reviewer_id, asset.project_id, asset, "Review overdue" if overdue else "Review due soon", asset.title,
                                  f"reminder:{asset.id}:{version}:{asset.current_stage}:{iso(asset.due_at)}:{bucket}:{reviewer_id}")
    return {"created": created}


def saved_views(member):
    return [saved_view_json(view) for view in repository.saved_views(member.id)]


def create_saved_view(member, data):
    name = text(data, "name", 100, required=True)
    filters = data.get("filters", {})
    allowed = {"projectId", "status", "q", "assigneeId", "overdue", "sort"}
    if not isinstance(filters, dict) or set(filters) - allowed:
        invalid("filters", "Use supported asset filters only.")
    if any(not isinstance(value, (str, bool)) for value in filters.values()):
        invalid("filters", "Filter values must be text or true/false.")
    assets.filtered(member, filters).count()
    if repository.saved_view_count(member.id) >= 20:
        raise AppError(409, "SAVED_VIEW_LIMIT", "You can save up to 20 views.")
    return saved_view_json(repository.add_saved_view(member_id=member.id, name=name, filters=filters))


def delete_saved_view(member, view_id):
    view = repository.saved_view(member.id, object_id(view_id))
    if view is None:
        raise AppError(404, "NOT_FOUND", "Saved view not found.")
    repository.delete_saved_view(view)


def reports(member, params):
    visible_projects = list(projects.accessible(member))
    records = list(repository.report_assets(assets.filtered(member, params, visible_projects)))
    timestamp = now()
    counts = Counter()
    project_counts = defaultdict(Counter)
    reviewer_counts = defaultdict(Counter)
    cycle_hours = 0
    cycle_count = 0
    for asset in records:
        overdue = bool(asset.due_at and asset.due_at.replace(tzinfo=timezone.utc) < timestamp
                       and asset.status in ("in_review", "changes_requested"))
        counts[asset.status] += 1
        counts["overdue"] += overdue
        totals = project_counts[asset.project_id]
        totals["total"] += 1
        totals[asset.status] += 1
        totals["overdue"] += overdue
        if asset.approved_at and asset.submitted_at:
            cycle_hours += (asset.approved_at - asset.submitted_at).total_seconds() / 3600
            cycle_count += 1
        if asset.status == "in_review" and asset.stages:
            version = asset.versions[-1].number
            decided = {item.reviewer_id for item in asset.decisions
                       if item.version == version and item.stage_index == asset.current_stage}
            for reviewer_id in set(asset.stages[asset.current_stage].reviewer_ids) - decided:
                reviewer_counts[reviewer_id]["assigned"] += 1
                reviewer_counts[reviewer_id]["overdue"] += overdue
    summary = {"totalAssets": len(records), "inReview": counts["in_review"], "approved": counts["approved"], "draft": counts["draft"],
               "changesRequested": counts["changes_requested"], "overdue": counts["overdue"],
               "approvalRate": round(counts["approved"] / len(records) * 100, 1) if records else 0,
               "averageCycleHours": round(cycle_hours / cycle_count, 1) if cycle_count else 0}
    by_project = []
    for project in visible_projects:
        totals = project_counts[project.id]
        by_project.append({"id": str(project.id), "name": project.name, "color": project.color, "total": totals["total"],
                           "approved": totals["approved"], "inReview": totals["in_review"], "overdue": totals["overdue"]})
    visible_members = set(value for project in visible_projects for value in project.member_ids)
    workload = []
    for reviewer in people.members_by_ids(visible_members):
        totals = reviewer_counts[reviewer.id]
        workload.append({"reviewer": member_json(reviewer), "assigned": totals["assigned"], "overdue": totals["overdue"]})
    event_counts = Counter(event.created_at.date().isoformat() for event in repository.approval_events([asset.id for asset in records], timestamp - timedelta(days=7)))
    trend = [{"date": (timestamp - timedelta(days=day)).date().isoformat(), "approvals": event_counts[(timestamp - timedelta(days=day)).date().isoformat()]} for day in range(6, -1, -1)]
    return {"summary": summary, "byProject": by_project, "workload": workload, "trend": trend}


def csv_cell(value):
    string = str(value or "")
    return "'" + string if string.lstrip().startswith(("=", "+", "-", "@", "\t", "\r", "\n")) else string


def export_csv(member, params):
    visible_projects = list(projects.accessible(member))
    records = repository.export_assets(assets.filtered(member, params, visible_projects))
    if records.count() > 10000:
        raise AppError(422, "EXPORT_TOO_LARGE", "Narrow your filters to export at most 10,000 assets.")
    project_names = {project.id: project.name for project in visible_projects}
    output = io.StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow(["Asset", "Project", "Type", "Status", "Version", "Due", "Approved"])
    for asset in records:
        writer.writerow([csv_cell(asset.title), csv_cell(project_names[asset.project_id]), asset.type, asset.status,
                         asset.versions[-1].number, iso(asset.due_at) or "", iso(asset.approved_at) or ""])
    return output.getvalue()
