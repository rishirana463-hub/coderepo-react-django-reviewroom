"""Reset only Reviewroom collections and install a repeatable, self-contained demo."""
import hashlib
import os
from datetime import timedelta

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "calendar_backend.settings")

import django
django.setup()

import bcrypt
from bson import ObjectId

from apps.assets.models import Asset, Comment, Decision, Reply, Stage, Version
from apps.auth.models import Member
from apps.insights.models import Activity, Notification, SavedView
from apps.insights.services import notify_stage, reminders
from apps.projects.models import Project
from apps.shared.documents import now
from scripts.seed_data import ASSETS, COPY, PROJECTS


def stable_id(label):
    return ObjectId(hashlib.sha256(label.encode()).hexdigest()[:24])


def seed():
    password = os.getenv("SEED_PASSWORD", "Reviewroom2026!")
    if len(password.encode()) > 72 or len(password) < 12:
        raise ValueError("SEED_PASSWORD must contain 12 to 72 bytes.")
    # Validate and hash configuration before performing the intentional demo reset.
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()
    for model in (Member, Project, Asset, Activity, Notification, SavedView):
        model.drop_collection()
    timestamp = now().replace(hour=10, minute=0, second=0, microsecond=0)
    people = {}
    for key, name, role, color in [
        ("owner", "Maya Chen", "owner", "#b5a0c6"), ("editor", "Alex Rivera", "editor", "#9bab8e"),
        ("reviewer", "Sam Taylor", "reviewer", "#c39f84"), ("creative", "Priya Shah", "reviewer", "#8ea7bd"),
        ("legal", "Jordan Lee", "reviewer", "#b6a47d"),
    ]:
        people[key] = Member(id=stable_id(f"member:{key}"), name=name, email=f"{key}@reviewroom.test", role=role,
                             color=color, password_hash=hashed, created_at=timestamp - timedelta(days=40)).save()
    projects = {}
    for index, (key, name, description, color) in enumerate(PROJECTS):
        projects[key] = Project(id=stable_id(f"project:{key}"), name=name, description=description, color=color,
                                member_ids=[member.id for member in people.values()], created_at=timestamp - timedelta(days=30 - index)).save()
    for index, (key, title, kind, image, status, due_offset, tags) in enumerate(ASSETS):
        created_at = timestamp - timedelta(days=9 - index % 6)
        version_number = 2 if index % 3 == 1 else 1
        content = COPY[key]
        versions = []
        if version_number == 2:
            versions.append(Version(number=1, title=title, content=content.replace("thoughtfully", "carefully"),
                                    media_path=f"/media/{image}.svg", author_id=people["editor"].id,
                                    note="Initial concept", created_at=created_at))
        versions.append(Version(number=version_number, title=title, content=content, media_path=f"/media/{image}.svg",
                                author_id=people["editor"].id, note="Refined copy and final visual direction" if version_number == 2 else "Initial concept",
                                created_at=created_at + timedelta(hours=3)))
        stage0 = Stage(name="Creative review", reviewer_ids=[people["reviewer"].id, people["creative"].id], quorum=1)
        stages = [stage0, Stage(name="Final sign-off", reviewer_ids=[people["legal"].id], quorum=1)]
        decisions = []
        stage_index = 0
        if status == "approved" or status == "in_review" and index % 3 == 0:
            decisions.append(Decision(version=version_number, stage_index=0, reviewer_id=people["reviewer"].id, decision="approve",
                                      note="Love the direction. Ready for final sign-off.", created_at=created_at + timedelta(days=1)))
            stage_index = 1
        if status == "approved":
            decisions.append(Decision(version=version_number, stage_index=1, reviewer_id=people["legal"].id, decision="approve",
                                      note="All clear. Approved for release.", created_at=created_at + timedelta(days=2)))
        if status == "changes_requested":
            decisions.append(Decision(version=version_number, stage_index=0, reviewer_id=people["reviewer"].id, decision="changes_requested",
                                      note="Could we make the call to action more specific and soften the opening line?", created_at=created_at + timedelta(days=1)))
        comments = []
        if status != "draft":
            comments.append(Comment(id=stable_id(f"comment:{index}"), version=version_number, author_id=people["creative"].id,
                body="The overall direction feels really considered. Could we give the headline a little more breathing room?" if kind == "image" else "This opening is lovely. Let's make the next step a little clearer for the reader.",
                anchor={"type": "image", "x": 0.45, "y": 0.3} if kind == "image" else {"type": "text", "start": 0, "end": min(30, len(content)), "quote": content[:30]},
                resolved=status == "approved", created_at=created_at + timedelta(hours=5),
                replies=[Reply(id=stable_id(f"reply:{index}"), author_id=people["editor"].id, body="Thanks, Priya. I'll explore that in the next pass.", created_at=created_at + timedelta(hours=6))]))
        if version_number == 2:
            comments.append(Comment(id=stable_id(f"old-comment:{index}"), version=1, author_id=people["reviewer"].id,
                                    body="Could we simplify the first sentence?", resolved=True, created_at=created_at + timedelta(hours=1)))
        asset = Asset(id=stable_id(f"asset:{index}"), project_id=projects[key].id, owner_id=people["editor"].id,
                      title=title, type=kind, status=status, tags=tags, due_at=timestamp + timedelta(days=due_offset, hours=8),
                      versions=versions, stages=stages, decisions=decisions, current_stage=stage_index, comments=comments,
                      submitted_at=created_at + timedelta(hours=4) if status != "draft" else None,
                      approved_at=created_at + timedelta(days=2) if status == "approved" else None,
                      created_at=created_at, updated_at=timestamp - timedelta(hours=index * 2)).save()
        Activity(id=stable_id(f"activity:{index}:create"), project_id=asset.project_id, asset_id=asset.id, asset_title=title,
                 actor_id=people["editor"].id, action="asset_created", description=f"created {title}", created_at=created_at).save()
        if status != "draft":
            Activity(id=stable_id(f"activity:{index}:submit"), project_id=asset.project_id, asset_id=asset.id, asset_title=title,
                     actor_id=people["editor"].id, action="review_submitted", description=f"submitted version {version_number} of {title}", created_at=created_at + timedelta(hours=4)).save()
        for decision_index, decision in enumerate(decisions):
            Activity(id=stable_id(f"activity:{index}:decision:{decision_index}"), project_id=asset.project_id, asset_id=asset.id,
                     asset_title=title, actor_id=decision.reviewer_id, action="review_approved" if decision.decision == "approve" else "changes_requested",
                     description=f"{'approved' if decision.decision == 'approve' else 'requested changes to'} version {version_number} of {title}", created_at=decision.created_at).save()
        if status == "in_review":
            notify_stage(asset, projects[key])
        if status in ("approved", "changes_requested"):
            Notification(id=stable_id(f"notification:{index}"), member_id=people["owner"].id, project_id=asset.project_id, asset_id=asset.id,
                         title="Ready to go" if status == "approved" else "Changes requested", body=f"{title} · {projects[key].name}",
                         dedupe_key=f"seed:{index}", read=index % 2 == 0, created_at=timestamp - timedelta(hours=index)).save()
    for key, label, filters in [("review", "Awaiting review", {"status": "in_review"}), ("changes", "Needs a little love", {"status": "changes_requested"}),
                                ("approved", "Ready to go", {"status": "approved"})]:
        SavedView(id=stable_id(f"saved:{key}"), member_id=people["owner"].id, name=label, filters=filters).save()
    reminders(people["owner"])
    print(f"Seeded {Member.objects.count()} members, {Project.objects.count()} projects, {Asset.objects.count()} assets.")


if __name__ == "__main__":
    seed()
