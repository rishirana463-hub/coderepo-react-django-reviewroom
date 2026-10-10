from apps.shared.authentication import require_editor
from apps.shared.documents import now
from apps.shared.errors import AppError
from . import repository
from .schema import project_input, project_json


def create(member, data):
    require_editor(member)
    fields = project_input(data)
    if member.id not in fields["member_ids"]:
        fields["member_ids"].append(member.id)
    project = repository.create(fields)
    from apps.insights.services import record
    record(member, project, "project_created", f"created {project.name}")
    return project_json(project)


def update(member, project_id, data):
    project = repository.get(member, project_id)
    if member.role != "owner":
        raise AppError(403, "FORBIDDEN", "Only workspace owners can change project settings.")
    fields = project_input(data, partial=True)
    if "member_ids" in fields:
        selected = set(fields["member_ids"])
        if not repository.active_reviewers(project).issubset(selected):
            raise AppError(409, "ACTIVE_ASSIGNMENTS", "Reassign active reviews before removing a project member.")
    for name, value in fields.items():
        setattr(project, name, value)
    project.updated_at = now()
    repository.save(project)
    from apps.insights.services import record
    record(member, project, "project_updated", f"updated {project.name}")
    return project_json(project)
