import re

from apps.auth import repository as members
from apps.shared.errors import invalid
from apps.shared.validation import boolean, object_id, text


def project_input(data, partial=False):
    result = {}
    for field, maximum in (("name", 100), ("description", 2000)):
        if field in data or not partial:
            result[field] = text(data, field, maximum, required=field == "name")
    if "color" in data or not partial:
        color = text(data, "color", 7, default="#94a991")
        if not re.fullmatch(r"#[0-9a-fA-F]{6}", color):
            invalid("color", "Choose a six-digit hex color.")
        result["color"] = color
    if "memberIds" in data or not partial:
        ids = data.get("memberIds", [])
        if not isinstance(ids, list) or len(ids) > 30:
            invalid("memberIds", "Choose up to 30 workspace members.")
        ids = list(dict.fromkeys(object_id(value, "memberIds") for value in ids))
        if members.count_ids(ids) != len(ids):
            invalid("memberIds", "One or more selected members do not exist.")
        result["member_ids"] = ids
    if "archived" in data:
        result["archived"] = boolean(data, "archived")
    return result


def project_json(project):
    from .repository import asset_counts
    count, approved = asset_counts(project)
    return {"id": str(project.id), "name": project.name, "description": project.description, "color": project.color,
            "memberIds": [str(value) for value in project.member_ids], "archived": project.archived,
            "assetCount": count, "approvedCount": approved}
