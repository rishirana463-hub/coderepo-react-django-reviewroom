"""Integration tests exercise real MongoDB and public HTTP routes in an isolated DB."""
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from urllib.parse import urlsplit

import bcrypt
import jwt
import mongoengine
from django.conf import settings
from django.test import SimpleTestCase
from rest_framework.test import APIClient

from apps.assets.models import Asset
from apps.auth.models import Member
from apps.insights.models import Activity, Notification, SavedView
from apps.projects.models import Project
from apps.shared.documents import now


def isolated_mongo_uri(uri, database_name):
    parsed = urlsplit(uri)
    if parsed.scheme != "mongodb" or parsed.hostname not in ("localhost", "127.0.0.1"):
        raise RuntimeError("Integration tests require a local MongoDB; refusing a remote destructive reset.")
    # A database in a MongoDB URI overrides connect(db=...). Replace it rather
    # than trusting the separate db argument before any collections are dropped.
    return parsed._replace(path="/" + database_name, fragment="").geturl()


class WorkflowIntegrationTests(SimpleTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        mongoengine.disconnect()
        uri = os.getenv("TEST_MONGODB_URI", "mongodb://127.0.0.1:27017")
        cls.test_db = f"reviewroom_test_{os.getpid()}"
        safe_uri = isolated_mongo_uri(uri, cls.test_db)
        mongoengine.connect(host=safe_uri, uuidRepresentation="standard", serverSelectionTimeoutMS=3000)
        if mongoengine.connection.get_db().name != cls.test_db:
            raise RuntimeError("Refusing to reset a database outside the isolated integration-test namespace.")
        cls.password_hash = bcrypt.hashpw(b"IntegrationPass2026!", bcrypt.gensalt(rounds=4)).decode()

    @classmethod
    def tearDownClass(cls):
        mongoengine.connection.get_connection().drop_database(cls.test_db)
        mongoengine.disconnect()
        mongoengine.connect(host=settings.MONGODB_URI, uuidRepresentation="standard", serverSelectionTimeoutMS=3000)
        super().tearDownClass()

    def setUp(self):
        for model in (Member, Project, Asset, Activity, Notification, SavedView):
            model.drop_collection()
        self.members = {}
        self.tokens = {}
        for key, role in (("owner", "owner"), ("editor", "editor"), ("reviewer", "reviewer"), ("reviewer2", "reviewer"), ("outsider", "reviewer")):
            member = Member(name=key.title(), email=f"{key}@example.test", role=role, password_hash=self.password_hash).save()
            self.members[key] = member
            response = APIClient().post("/api/v1/auth/login", {"email": member.email, "password": "IntegrationPass2026!"}, format="json")
            self.assertEqual(response.status_code, 200)
            self.tokens[key] = response.json()["data"]["token"]
        self.project = Project(name="Campaign", description="Test campaign", member_ids=[self.members[key].id for key in ("owner", "editor", "reviewer", "reviewer2")]).save()

    def call(self, method, path, data=None, user="owner"):
        client = APIClient()
        if user:
            client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.tokens[user]}")
        return getattr(client, method)(f"/api/v1{path}", data, format="json")

    def make_asset(self, quorum=1, second_stage=False, title="A summer story"):
        stages = [{"name": "Creative", "reviewerIds": [str(self.members[key].id) for key in ("reviewer", "reviewer2")], "quorum": quorum}]
        if second_stage:
            stages.append({"name": "Final", "reviewerIds": [str(self.members["owner"].id)], "quorum": 1})
        response = self.call("post", "/assets", {"projectId": str(self.project.id), "title": title, "type": "copy", "content": "A thoughtful summer story.",
            "stages": stages, "dueAt": (now() - timedelta(days=1)).isoformat()}, user="editor")
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()["data"]

    def submit(self, asset):
        response = self.call("post", f"/assets/{asset['id']}/submit", {"revision": asset["revision"]}, user="editor")
        self.assertEqual(response.status_code, 200, response.content)
        return response.json()["data"]

    def decide(self, asset, user="reviewer", decision="approve", note="Looks good"):
        return self.call("post", f"/assets/{asset['id']}/decisions", {"revision": asset["revision"], "version": asset["version"], "decision": decision, "note": note}, user=user)

    def test_authentication_and_server_side_logout_revocation(self):
        self.assertEqual(self.call("get", "/projects", user=None).status_code, 401)
        invalid = APIClient().post("/api/v1/auth/login", {"email": "owner@example.test", "password": "wrong"}, format="json")
        self.assertEqual(invalid.status_code, 401)
        self.assertEqual(self.call("get", "/auth/me").json()["data"]["role"], "owner")
        self.assertEqual(self.call("post", "/auth/logout", {}).status_code, 200)
        self.assertEqual(self.call("get", "/auth/me").status_code, 401)

    def test_mongo_uri_database_cannot_override_test_isolation(self):
        uri = "mongodb://tester:password@127.0.0.1:27017/reviewroom_db?authSource=admin&retryWrites=false"
        result = urlsplit(isolated_mongo_uri(uri, self.test_db))
        self.assertEqual(result.path, "/" + self.test_db)
        self.assertEqual(result.username, "tester")
        self.assertEqual(result.query, "authSource=admin&retryWrites=false")
        with self.assertRaises(RuntimeError):
            isolated_mongo_uri("mongodb://example.com:27017/reviewroom_db", self.test_db)
        self.assertEqual(mongoengine.connection.get_db().name, self.test_db)

    def test_invalid_signed_subject_is_an_authentication_error(self):
        payload = {"sub": "not-a-mongo-id", "ver": 0, "iat": now(), "exp": now() + timedelta(hours=1),
                   "iss": settings.JWT_ISSUER, "aud": settings.JWT_AUDIENCE}
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION="Bearer " + jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256"))
        self.assertEqual(client.get("/api/v1/auth/me").status_code, 401)

    def test_project_authorization_filters_all_surfaces(self):
        asset = self.make_asset()
        self.assertEqual(self.call("get", f"/assets/{asset['id']}", user="outsider").status_code, 404)
        self.assertEqual(self.call("get", "/assets", user="outsider").json()["data"]["total"], 0)
        self.assertEqual(self.call("get", "/activity", user="outsider").json()["data"], [])
        self.assertEqual(self.call("get", "/reports", user="outsider").json()["data"]["summary"]["totalAssets"], 0)
        self.assertEqual(self.call("patch", f"/projects/{self.project.id}", {"name": "No"}, user="editor").status_code, 403)
        self.assertEqual(self.call("post", "/projects", {"name": "No"}, user="reviewer").status_code, 403)

    def test_ordered_quorum_and_final_exact_version_export(self):
        asset = self.submit(self.make_asset(quorum=2, second_stage=True))
        self.assertEqual(self.decide(asset, user="owner").status_code, 403)
        asset = self.decide(asset).json()["data"]
        self.assertEqual(asset["currentStage"], 0)
        self.assertEqual(self.decide(asset).status_code, 409)
        asset = self.decide(asset, user="reviewer2").json()["data"]
        self.assertEqual(asset["currentStage"], 1)
        self.assertEqual(self.decide(asset, user="reviewer2").status_code, 403)
        asset = self.decide(asset, user="owner").json()["data"]
        self.assertEqual(asset["status"], "approved")
        manifest = self.call("get", f"/assets/{asset['id']}/export")
        self.assertEqual(manifest.status_code, 200)
        self.assertEqual(len(manifest.json()["data"]["decisions"]), 3)

    def test_new_version_invalidates_approval_and_keeps_history(self):
        asset = self.submit(self.make_asset())
        asset = self.decide(asset).json()["data"]
        self.assertEqual(asset["status"], "approved")
        response = self.call("post", f"/assets/{asset['id']}/versions", {"revision": asset["revision"], "content": "A revised story.", "note": "Clearer opening"}, user="editor")
        self.assertEqual(response.status_code, 201)
        new_asset = response.json()["data"]
        self.assertEqual(new_asset["status"], "draft")
        self.assertEqual(new_asset["version"], 2)
        self.assertEqual(new_asset["versions"][0]["content"], "A thoughtful summer story.")
        self.assertEqual(len(new_asset["decisions"]), 1)
        self.assertEqual(self.call("get", f"/assets/{asset['id']}/export").status_code, 409)
        new_asset = self.submit(new_asset)
        stale = self.call("post", f"/assets/{asset['id']}/decisions", {"revision": new_asset["revision"], "version": 1, "decision": "approve"}, user="reviewer")
        self.assertEqual(stale.status_code, 409)

    def test_change_request_requires_reason_and_new_version(self):
        asset = self.submit(self.make_asset())
        self.assertEqual(self.decide(asset, decision="changes_requested", note="").status_code, 422)
        asset = self.decide(asset, decision="changes_requested", note="Clarify the opening.").json()["data"]
        self.assertEqual(asset["status"], "changes_requested")
        self.assertEqual(self.decide(asset, user="reviewer2").status_code, 409)
        self.assertEqual(self.call("post", f"/assets/{asset['id']}/submit", {"revision": asset["revision"]}, user="editor").status_code, 409)

    def test_concurrent_decisions_preserve_one_atomic_result(self):
        asset = self.submit(self.make_asset(quorum=2))
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda user: self.decide(asset, user=user), ["reviewer", "reviewer2"]))
        self.assertEqual(sorted(result.status_code for result in results), [200, 409])
        latest = self.call("get", f"/assets/{asset['id']}").json()["data"]
        self.assertEqual(len(latest["decisions"]), 1)
        self.assertEqual(latest["status"], "in_review")

    def test_feedback_anchor_reply_resolution_and_stale_version(self):
        asset = self.make_asset()
        bad = self.call("post", f"/assets/{asset['id']}/comments", {"version": 1, "body": "Comment", "anchor": {"type": "text", "start": 0, "end": 999}}, user="reviewer")
        self.assertEqual(bad.status_code, 422)
        response = self.call("post", f"/assets/{asset['id']}/comments", {"version": 1, "body": "Clarify this", "anchor": {"type": "text", "start": 0, "end": 12}}, user="reviewer")
        self.assertEqual(response.status_code, 201)
        asset = response.json()["data"]
        comment_id = asset["comments"][0]["id"]
        self.assertEqual(asset["comments"][0]["anchor"]["quote"], "A thoughtful")
        self.assertEqual(self.call("post", f"/assets/{asset['id']}/comments/{comment_id}/replies", {"body": "On it"}, user="editor").status_code, 201)
        self.assertEqual(self.call("patch", f"/assets/{asset['id']}/comments/{comment_id}", {"resolved": True}, user="reviewer2").status_code, 403)
        asset = self.call("patch", f"/assets/{asset['id']}/comments/{comment_id}", {"resolved": True}, user="editor").json()["data"]
        asset = self.call("post", f"/assets/{asset['id']}/versions", {"revision": asset["revision"], "content": "A new version"}, user="editor").json()["data"]
        self.assertTrue(asset["comments"][0]["stale"])
        self.assertEqual(len(asset["comments"][0]["replies"]), 1)

    def test_reminders_are_idempotent_and_inbox_is_private(self):
        asset = self.submit(self.make_asset())
        first = self.call("post", "/reminders/process", {})
        second = self.call("post", "/reminders/process", {})
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.json()["data"]["created"], 2)
        self.assertEqual(second.json()["data"]["created"], 0)
        inbox = self.call("get", "/inbox", user="reviewer").json()["data"]
        self.assertEqual(len(inbox), 2)
        self.assertEqual(self.call("patch", f"/inbox/{inbox[0]['id']}", {"read": True}, user="reviewer2").status_code, 404)
        self.assertTrue(self.call("patch", f"/inbox/{inbox[0]['id']}", {"read": True}, user="reviewer").json()["data"]["read"])
        self.assertEqual(self.call("post", "/reminders/process", {}, user="editor").status_code, 403)

    def test_saved_views_bounded_pagination_and_csv_injection(self):
        self.make_asset(title="=HYPERLINK(\"bad\")")
        self.make_asset(title="Normal")
        result = self.call("get", "/assets?page=1&pageSize=1").json()["data"]
        self.assertEqual(result["total"], 2)
        self.assertEqual(len(result["items"]), 1)
        self.assertEqual(self.call("get", "/assets?pageSize=101").status_code, 422)
        self.assertEqual(self.call("get", "/assets?status=bad").status_code, 422)
        response = self.call("post", "/saved-views", {"name": "Drafts", "filters": {"status": "draft"}})
        self.assertEqual(response.status_code, 201)
        view_id = response.json()["data"]["id"]
        self.assertEqual(self.call("delete", f"/saved-views/{view_id}", user="editor").status_code, 404)
        self.assertEqual(self.call("delete", f"/saved-views/{view_id}").status_code, 204)
        self.assertIn("'=HYPERLINK", self.call("get", "/reports/export.csv").content.decode())
        self.assertEqual(self.call("get", "/reports", user="owner").json()["data"]["summary"]["totalAssets"], 2)

    def test_archived_project_and_incompatible_assignments(self):
        self.assertEqual(self.call("post", "/assets", {"projectId": str(self.project.id), "title": "Invalid", "type": "copy", "stages": [{"name": "Self", "reviewerIds": [str(self.members['editor'].id)], "quorum": 1}]}, user="editor").status_code, 422)
        asset = self.submit(self.make_asset())
        member_ids = [str(self.members[key].id) for key in ("owner", "editor")]
        self.assertEqual(self.call("patch", f"/projects/{self.project.id}", {"memberIds": member_ids}).status_code, 409)
        self.assertEqual(self.call("patch", f"/projects/{self.project.id}", {"archived": True}).status_code, 200)
        self.assertEqual(self.decide(asset).status_code, 409)
        self.assertFalse(self.call("get", f"/assets/{asset['id']}").json()["data"]["canEdit"])

    def test_request_validation_and_invalid_media(self):
        self.assertEqual(self.call("post", "/assets", [], user="editor").status_code, 422)
        self.assertEqual(self.call("get", "/assets/not-an-id").status_code, 422)
        self.assertEqual(self.call("post", "/assets", {"projectId": str(self.project.id), "title": "Image", "type": "image", "mediaPath": "https://evil.test/track.svg"}, user="editor").status_code, 422)
