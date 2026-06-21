import io
import os
import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

SAMPLE_SCHEMA = {
    "type": "object",
    "properties": {"name": {"type": "string"}, "email": {"type": "string"}},
    "required": ["name", "email"],
}


async def create_project(client, headers):
    resp = await client.post("/api/v1/projects", headers=headers, json={"name": "SocialTestProj"})
    return resp.json()["id"]


async def create_doc_type(client, headers, pid):
    resp = await client.post(f"/api/v1/projects/{pid}/document-types", headers=headers, json={
        "name": "SocialDocType", "schema_definition": SAMPLE_SCHEMA,
    })
    return resp.json()["id"]


async def submit_doc(client, headers, pid, tid):
    resp = await client.post(
        f"/api/v1/projects/{pid}/documents/document-types/{tid}",
        headers=headers,
        json={"extracted_data": {"name": "Test", "email": "test@test.com"}},
    )
    return resp.json()


class TestComments:
    async def test_create_comment(self, client: AsyncClient, admin_headers):
        pid = await create_project(client, admin_headers)
        tid = await create_doc_type(client, admin_headers, pid)
        doc = await submit_doc(client, admin_headers, pid, tid)
        resp = await client.post(
            f"/api/v1/projects/{pid}/documents/{doc['id']}/comments",
            headers=admin_headers,
            json={"content": "Great document!"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["content"] == "Great document!"
        assert data["author_name"] == "Admin User"
        assert data["parent_id"] is None

    async def test_list_comments(self, client: AsyncClient, admin_headers):
        pid = await create_project(client, admin_headers)
        tid = await create_doc_type(client, admin_headers, pid)
        doc = await submit_doc(client, admin_headers, pid, tid)
        await client.post(
            f"/api/v1/projects/{pid}/documents/{doc['id']}/comments",
            headers=admin_headers,
            json={"content": "First comment"},
        )
        resp = await client.get(
            f"/api/v1/projects/{pid}/documents/{doc['id']}/comments",
            headers=admin_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 1

    async def test_create_reply(self, client: AsyncClient, admin_headers, reviewer_headers):
        pid = await create_project(client, admin_headers)
        tid = await create_doc_type(client, admin_headers, pid)
        doc = await submit_doc(client, admin_headers, pid, tid)
        c1 = await client.post(
            f"/api/v1/projects/{pid}/documents/{doc['id']}/comments",
            headers=admin_headers,
            json={"content": "Parent"},
        )
        parent_id = c1.json()["id"]
        resp = await client.post(
            f"/api/v1/projects/{pid}/documents/{doc['id']}/comments",
            headers=reviewer_headers,
            json={"content": "Reply", "parent_id": parent_id},
        )
        assert resp.status_code == 201
        assert resp.json()["parent_id"] == parent_id

    async def test_create_reply_nonexistent_parent(self, client: AsyncClient, admin_headers):
        pid = await create_project(client, admin_headers)
        tid = await create_doc_type(client, admin_headers, pid)
        doc = await submit_doc(client, admin_headers, pid, tid)
        resp = await client.post(
            f"/api/v1/projects/{pid}/documents/{doc['id']}/comments",
            headers=admin_headers,
            json={"content": "Orphan", "parent_id": "bad-id"},
        )
        assert resp.status_code == 404

    async def test_update_own_comment(self, client: AsyncClient, admin_headers):
        pid = await create_project(client, admin_headers)
        tid = await create_doc_type(client, admin_headers, pid)
        doc = await submit_doc(client, admin_headers, pid, tid)
        c = await client.post(
            f"/api/v1/projects/{pid}/documents/{doc['id']}/comments",
            headers=admin_headers,
            json={"content": "Original"},
        )
        resp = await client.patch(
            f"/api/v1/projects/{pid}/documents/{doc['id']}/comments/{c.json()['id']}",
            headers=admin_headers,
            json={"content": "Updated"},
        )
        assert resp.status_code == 200
        assert resp.json()["content"] == "Updated"

    async def test_update_others_comment_forbidden(self, client: AsyncClient, admin_headers, reviewer_headers):
        pid = await create_project(client, admin_headers)
        tid = await create_doc_type(client, admin_headers, pid)
        doc = await submit_doc(client, admin_headers, pid, tid)
        c = await client.post(
            f"/api/v1/projects/{pid}/documents/{doc['id']}/comments",
            headers=admin_headers,
            json={"content": "Admin comment"},
        )
        resp = await client.patch(
            f"/api/v1/projects/{pid}/documents/{doc['id']}/comments/{c.json()['id']}",
            headers=reviewer_headers,
            json={"content": "Hijacked"},
        )
        assert resp.status_code == 403

    async def test_delete_own_comment(self, client: AsyncClient, admin_headers):
        pid = await create_project(client, admin_headers)
        tid = await create_doc_type(client, admin_headers, pid)
        doc = await submit_doc(client, admin_headers, pid, tid)
        c = await client.post(
            f"/api/v1/projects/{pid}/documents/{doc['id']}/comments",
            headers=admin_headers,
            json={"content": "Delete me"},
        )
        resp = await client.delete(
            f"/api/v1/projects/{pid}/documents/{doc['id']}/comments/{c.json()['id']}",
            headers=admin_headers,
        )
        assert resp.status_code == 204

    async def test_delete_others_comment_as_admin(self, client: AsyncClient, admin_headers, reviewer_headers):
        pid = await create_project(client, admin_headers)
        tid = await create_doc_type(client, admin_headers, pid)
        doc = await submit_doc(client, admin_headers, pid, tid)
        c = await client.post(
            f"/api/v1/projects/{pid}/documents/{doc['id']}/comments",
            headers=reviewer_headers,
            json={"content": "Reviewer comment"},
        )
        resp = await client.delete(
            f"/api/v1/projects/{pid}/documents/{doc['id']}/comments/{c.json()['id']}",
            headers=admin_headers,
        )
        assert resp.status_code == 204

    async def test_delete_others_comment_as_viewer_forbidden(self, client: AsyncClient, admin_headers, viewer_headers, reviewer_headers):
        pid = await create_project(client, admin_headers)
        tid = await create_doc_type(client, admin_headers, pid)
        doc = await submit_doc(client, admin_headers, pid, tid)
        c = await client.post(
            f"/api/v1/projects/{pid}/documents/{doc['id']}/comments",
            headers=reviewer_headers,
            json={"content": "Reviewer comment"},
        )
        resp = await client.delete(
            f"/api/v1/projects/{pid}/documents/{doc['id']}/comments/{c.json()['id']}",
            headers=viewer_headers,
        )
        assert resp.status_code == 403


class TestAttachments:
    async def test_upload_attachment(self, client: AsyncClient, admin_headers):
        pid = await create_project(client, admin_headers)
        tid = await create_doc_type(client, admin_headers, pid)
        doc = await submit_doc(client, admin_headers, pid, tid)
        file_content = b"Hello, this is a test file"
        resp = await client.post(
            f"/api/v1/attachments/{doc['id']}",
            headers=admin_headers,
            files={"file": ("test.txt", io.BytesIO(file_content), "text/plain")},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["file_name"] == "test.txt"
        assert data["mime_type"] == "text/plain"
        assert data["file_size"] == len(file_content)
        assert "/uploads/" in data["url"]

    async def test_upload_invalid_mime(self, client: AsyncClient, admin_headers):
        pid = await create_project(client, admin_headers)
        tid = await create_doc_type(client, admin_headers, pid)
        doc = await submit_doc(client, admin_headers, pid, tid)
        resp = await client.post(
            f"/api/v1/attachments/{doc['id']}",
            headers=admin_headers,
            files={"file": ("test.exe", io.BytesIO(b"binary"), "application/x-msdownload")},
        )
        assert resp.status_code == 400

    async def test_upload_to_nonexistent_doc(self, client: AsyncClient, admin_headers):
        resp = await client.post(
            "/api/v1/attachments/bad-id",
            headers=admin_headers,
            files={"file": ("test.txt", io.BytesIO(b"data"), "text/plain")},
        )
        assert resp.status_code == 404

    async def test_list_attachments(self, client: AsyncClient, admin_headers):
        pid = await create_project(client, admin_headers)
        tid = await create_doc_type(client, admin_headers, pid)
        doc = await submit_doc(client, admin_headers, pid, tid)
        await client.post(
            f"/api/v1/attachments/{doc['id']}",
            headers=admin_headers,
            files={"file": ("a.txt", io.BytesIO(b"aaa"), "text/plain")},
        )
        resp = await client.get(f"/api/v1/attachments/{doc['id']}", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 1

    async def test_delete_attachment(self, client: AsyncClient, admin_headers):
        pid = await create_project(client, admin_headers)
        tid = await create_doc_type(client, admin_headers, pid)
        doc = await submit_doc(client, admin_headers, pid, tid)
        upload = await client.post(
            f"/api/v1/attachments/{doc['id']}",
            headers=admin_headers,
            files={"file": ("del.txt", io.BytesIO(b"delete"), "text/plain")},
        )
        att_id = upload.json()["id"]
        resp = await client.delete(f"/api/v1/attachments/{att_id}", headers=admin_headers)
        assert resp.status_code == 204

    async def test_delete_nonexistent_attachment(self, client: AsyncClient, admin_headers):
        resp = await client.delete("/api/v1/attachments/bad-id", headers=admin_headers)
        assert resp.status_code == 404


class TestNotifications:
    async def test_list_notifications_empty(self, client: AsyncClient, admin_headers):
        resp = await client.get("/api/v1/notifications", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_unread_count_zero(self, client: AsyncClient, admin_headers):
        resp = await client.get("/api/v1/notifications/unread-count", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["count"] == 0

    async def test_create_and_mark_read(self, client: AsyncClient, admin_headers, admin_user, db_session):
        from app.models.notification import Notification
        notif = Notification(
            user_id=admin_user.id,
            type="test",
            title="Test Notification",
            message="This is a test",
        )
        db_session.add(notif)
        await db_session.commit()
        await db_session.refresh(notif)

        unread = await client.get("/api/v1/notifications/unread-count", headers=admin_headers)
        assert unread.json()["count"] == 1

        resp = await client.patch(f"/api/v1/notifications/{notif.id}/read", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["is_read"] is True

        unread2 = await client.get("/api/v1/notifications/unread-count", headers=admin_headers)
        assert unread2.json()["count"] == 0

    async def test_mark_all_read(self, client: AsyncClient, admin_headers, admin_user, db_session):
        from app.models.notification import Notification
        for i in range(3):
            db_session.add(Notification(
                user_id=admin_user.id,
                type="test",
                title=f"Notif {i}",
                message="Batch",
            ))
        await db_session.commit()

        resp = await client.post("/api/v1/notifications/mark-all-read", headers=admin_headers)
        assert resp.status_code == 200

        unread = await client.get("/api/v1/notifications/unread-count", headers=admin_headers)
        assert unread.json()["count"] == 0

    async def test_mark_read_not_found(self, client: AsyncClient, admin_headers):
        resp = await client.patch("/api/v1/notifications/bad-id/read", headers=admin_headers)
        assert resp.status_code == 404

    async def test_notifications_isolated_per_user(self, client: AsyncClient, admin_headers, reviewer_headers, admin_user, db_session):
        from app.models.notification import Notification
        db_session.add(Notification(
            user_id=admin_user.id, type="test", title="Admin only", message="Secret",
        ))
        await db_session.commit()

        admin_list = await client.get("/api/v1/notifications", headers=admin_headers)
        assert len(admin_list.json()) == 1

        reviewer_list = await client.get("/api/v1/notifications", headers=reviewer_headers)
        assert len(reviewer_list.json()) == 0


class TestSubscriptions:
    async def test_upsert_subscription(self, client: AsyncClient, admin_headers):
        pid = await create_project(client, admin_headers)
        tid = await create_doc_type(client, admin_headers, pid)
        resp = await client.put("/api/v1/subscriptions", headers=admin_headers, json={
            "project_id": pid,
            "document_type_id": tid,
            "notify_on": ["pending_review", "rejected"],
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["document_type_id"] == tid

    async def test_list_subscriptions(self, client: AsyncClient, admin_headers):
        pid = await create_project(client, admin_headers)
        tid = await create_doc_type(client, admin_headers, pid)
        await client.put("/api/v1/subscriptions", headers=admin_headers, json={
            "project_id": pid,
            "document_type_id": tid,
            "notify_on": ["pending_review"],
        })
        resp = await client.get("/api/v1/subscriptions", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 1

    async def test_delete_subscription(self, client: AsyncClient, admin_headers):
        pid = await create_project(client, admin_headers)
        tid = await create_doc_type(client, admin_headers, pid)
        create = await client.put("/api/v1/subscriptions", headers=admin_headers, json={
            "project_id": pid,
            "document_type_id": tid,
            "notify_on": ["approved"],
        })
        sub_id = create.json()["id"]
        resp = await client.delete(f"/api/v1/subscriptions/{sub_id}", headers=admin_headers)
        assert resp.status_code == 204

    async def test_delete_nonexistent_subscription(self, client: AsyncClient, admin_headers):
        resp = await client.delete("/api/v1/subscriptions/bad-id", headers=admin_headers)
        assert resp.status_code == 404
