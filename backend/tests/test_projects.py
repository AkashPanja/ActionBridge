import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


class TestProjectCRUD:
    async def test_create_project(self, client: AsyncClient, admin_headers):
        resp = await client.post("/api/v1/projects", headers=admin_headers, json={
            "name": "Test Project",
            "description": "A test project",
            "visibility": "private",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Test Project"
        assert data["visibility"] == "private"
        assert data["created_by"] is not None

    async def test_create_project_duplicate_name(self, client: AsyncClient, admin_headers):
        await client.post("/api/v1/projects", headers=admin_headers, json={
            "name": "Unique Project",
        })
        resp = await client.post("/api/v1/projects", headers=admin_headers, json={
            "name": "Unique Project",
        })
        assert resp.status_code == 409

    async def test_create_project_as_reviewer_forbidden(self, client: AsyncClient, reviewer_headers):
        resp = await client.post("/api/v1/projects", headers=reviewer_headers, json={
            "name": "Reviewer Project",
        })
        assert resp.status_code == 403

    async def test_list_projects(self, client: AsyncClient, admin_headers):
        await client.post("/api/v1/projects", headers=admin_headers, json={"name": "P1"})
        await client.post("/api/v1/projects", headers=admin_headers, json={"name": "P2"})
        resp = await client.get("/api/v1/projects", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 2

    async def test_get_project(self, client: AsyncClient, admin_headers):
        create_resp = await client.post("/api/v1/projects", headers=admin_headers, json={"name": "GetMe"})
        pid = create_resp.json()["id"]
        resp = await client.get(f"/api/v1/projects/{pid}", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "GetMe"

    async def test_get_project_not_found(self, client: AsyncClient, admin_headers):
        resp = await client.get("/api/v1/projects/nonexistent", headers=admin_headers)
        assert resp.status_code == 404

    async def test_update_project(self, client: AsyncClient, admin_headers):
        create_resp = await client.post("/api/v1/projects", headers=admin_headers, json={"name": "Before"})
        pid = create_resp.json()["id"]
        resp = await client.patch(f"/api/v1/projects/{pid}", headers=admin_headers, json={
            "name": "After",
            "description": "Updated",
        })
        assert resp.status_code == 200
        assert resp.json()["name"] == "After"
        assert resp.json()["description"] == "Updated"

    async def test_delete_project(self, client: AsyncClient, admin_headers):
        create_resp = await client.post("/api/v1/projects", headers=admin_headers, json={"name": "DeleteMe"})
        pid = create_resp.json()["id"]
        resp = await client.delete(f"/api/v1/projects/{pid}", headers=admin_headers)
        assert resp.status_code == 204

    async def test_delete_project_not_found(self, client: AsyncClient, admin_headers):
        resp = await client.delete("/api/v1/projects/nonexistent", headers=admin_headers)
        assert resp.status_code == 404

    async def test_bulk_delete_projects(self, client: AsyncClient, admin_headers):
        r1 = await client.post("/api/v1/projects", headers=admin_headers, json={"name": "B1"})
        r2 = await client.post("/api/v1/projects", headers=admin_headers, json={"name": "B2"})
        resp = await client.post("/api/v1/projects/bulk-delete", headers=admin_headers, json={
            "ids": [r1.json()["id"], r2.json()["id"]],
        })
        assert resp.status_code == 200
        assert resp.json()["deleted"] == 2


class TestProjectVisibility:
    async def test_public_project_visible_to_all(self, client: AsyncClient, admin_headers, reviewer_headers):
        await client.post("/api/v1/projects", headers=admin_headers, json={
            "name": "Public Project", "visibility": "public",
        })
        resp = await client.get("/api/v1/projects", headers=reviewer_headers)
        assert len(resp.json()) == 1

    async def test_private_project_hidden_from_non_members(self, client: AsyncClient, admin_headers, reviewer_headers):
        await client.post("/api/v1/projects", headers=admin_headers, json={
            "name": "Private Project", "visibility": "private",
        })
        resp = await client.get("/api/v1/projects", headers=reviewer_headers)
        assert len(resp.json()) == 0


class TestProjectMembership:
    async def test_invite_member(self, client: AsyncClient, admin_headers, reviewer_user):
        proj = await client.post("/api/v1/projects", headers=admin_headers, json={"name": "InviteTest"})
        pid = proj.json()["id"]
        resp = await client.post(f"/api/v1/projects/{pid}/invite", headers=admin_headers, json={
            "user_id": reviewer_user.id,
            "role": "viewer",
        })
        assert resp.status_code == 201
        assert resp.json()["user_id"] == reviewer_user.id

    async def test_list_members(self, client: AsyncClient, admin_headers):
        proj = await client.post("/api/v1/projects", headers=admin_headers, json={"name": "MembersTest"})
        pid = proj.json()["id"]
        resp = await client.get(f"/api/v1/projects/{pid}/members", headers=admin_headers)
        assert resp.status_code == 200
        members = resp.json()
        assert isinstance(members, list)
        assert len(members) >= 1

    async def test_update_member_role(self, client: AsyncClient, admin_headers, reviewer_user):
        proj = await client.post("/api/v1/projects", headers=admin_headers, json={"name": "RoleTest"})
        pid = proj.json()["id"]
        inv = await client.post(f"/api/v1/projects/{pid}/invite", headers=admin_headers, json={
            "user_id": reviewer_user.id, "role": "viewer",
        })
        mid = inv.json()["id"]
        resp = await client.patch(f"/api/v1/projects/members/{mid}/role", headers=admin_headers, json={
            "user_id": reviewer_user.id, "role": "reviewer",
        })
        assert resp.status_code == 200
        assert resp.json()["role"] == "reviewer"

    async def test_remove_member(self, client: AsyncClient, admin_headers, reviewer_user):
        proj = await client.post("/api/v1/projects", headers=admin_headers, json={"name": "RemoveTest"})
        pid = proj.json()["id"]
        inv = await client.post(f"/api/v1/projects/{pid}/invite", headers=admin_headers, json={
            "user_id": reviewer_user.id, "role": "viewer",
        })
        mid = inv.json()["id"]
        resp = await client.delete(f"/api/v1/projects/members/{mid}", headers=admin_headers)
        assert resp.status_code == 204

    async def test_accept_invitation(self, client: AsyncClient, admin_headers, reviewer_user, reviewer_headers):
        proj = await client.post("/api/v1/projects", headers=admin_headers, json={"name": "AcceptTest"})
        pid = proj.json()["id"]
        inv = await client.post(f"/api/v1/projects/{pid}/invite", headers=admin_headers, json={
            "user_id": reviewer_user.id, "role": "viewer",
        })
        mid = inv.json()["id"]
        resp = await client.post(f"/api/v1/invitations/{mid}/accept", headers=reviewer_headers)
        assert resp.status_code == 200

    async def test_decline_invitation(self, client: AsyncClient, admin_headers, reviewer_user, reviewer_headers):
        proj = await client.post("/api/v1/projects", headers=admin_headers, json={"name": "DeclineTest"})
        pid = proj.json()["id"]
        inv = await client.post(f"/api/v1/projects/{pid}/invite", headers=admin_headers, json={
            "user_id": reviewer_user.id, "role": "viewer",
        })
        mid = inv.json()["id"]
        resp = await client.post(f"/api/v1/invitations/{mid}/decline", headers=reviewer_headers)
        assert resp.status_code == 200


class TestProjectStats:
    async def test_get_stats(self, client: AsyncClient, admin_headers):
        proj = await client.post("/api/v1/projects", headers=admin_headers, json={"name": "StatsTest"})
        pid = proj.json()["id"]
        resp = await client.get(f"/api/v1/projects/{pid}/stats", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "total_documents" in data
        assert "status_breakdown" in data
        assert "daily_volume" in data

    async def test_get_recent_activity(self, client: AsyncClient, admin_headers):
        proj = await client.post("/api/v1/projects", headers=admin_headers, json={"name": "ActivityTest"})
        pid = proj.json()["id"]
        resp = await client.get(f"/api/v1/projects/{pid}/recent-activity", headers=admin_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


class TestProjectPermissions:
    async def test_viewer_cannot_create_project(self, client: AsyncClient, viewer_headers):
        resp = await client.post("/api/v1/projects", headers=viewer_headers, json={"name": "ShouldFail"})
        assert resp.status_code == 403

    async def test_viewer_can_read_project(self, client: AsyncClient, admin_headers, viewer_headers):
        proj = await client.post("/api/v1/projects", headers=admin_headers, json={
            "name": "PublicForViewer", "visibility": "public",
        })
        pid = proj.json()["id"]
        resp = await client.get(f"/api/v1/projects/{pid}", headers=viewer_headers)
        assert resp.status_code == 200

    async def test_reviewer_cannot_delete_project(self, client: AsyncClient, admin_headers, reviewer_headers):
        proj = await client.post("/api/v1/projects", headers=admin_headers, json={"name": "ProtectMe"})
        pid = proj.json()["id"]
        resp = await client.delete(f"/api/v1/projects/{pid}", headers=reviewer_headers)
        assert resp.status_code == 403
