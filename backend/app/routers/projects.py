from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import RequirePermission, get_current_active_user
from app.auth.permissions import RequireProjectPermission, check_project_permission
from app.database import get_db
from app.schemas.document_type import BulkIds
from app.schemas.project import (
    InviteRequest,
    MemberResponse,
    ProjectCreate,
    ProjectResponse,
    ProjectStats,
    ProjectUpdate,
)
from app.services import project_service

router = APIRouter(prefix="/api/v1/projects", tags=["Projects"])


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(RequirePermission("projects:write")),
):
    try:
        return await project_service.create_project(db, data, user_id=user.id)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_active_user),
):
    is_admin = user.role == "admin"
    return await project_service.list_projects(db, search, user_id=user.id, is_admin=is_admin)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(RequireProjectPermission("projects:read")),
):
    project = await project_service.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(RequireProjectPermission("projects:write")),
):
    try:
        project = await project_service.update_project(db, project_id, data)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("/{project_id}/recent-activity")
async def get_recent_activity(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(RequireProjectPermission("projects:read")),
):
    return await project_service.get_recent_activity(db, project_id)


@router.get("/{project_id}/stats", response_model=ProjectStats)
async def get_project_stats(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(RequireProjectPermission("projects:read")),
):
    return await project_service.get_project_stats(db, project_id)


@router.post("/bulk-delete", status_code=200)
async def bulk_delete_projects(
    data: BulkIds,
    db: AsyncSession = Depends(get_db),
    user=Depends(RequirePermission("projects:write")),
):
    count = await project_service.bulk_delete_projects(db, data.ids)
    return {"deleted": count}


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(RequireProjectPermission("projects:delete")),
):
    deleted = await project_service.delete_project(db, project_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")


@router.get("/{project_id}/members", response_model=list[MemberResponse])
async def list_members(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(RequireProjectPermission("projects:read")),
):
    project = await project_service.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return await project_service.list_members(db, project_id)


@router.post("/{project_id}/invite", response_model=MemberResponse, status_code=201)
async def invite_member(
    project_id: str,
    data: InviteRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(RequireProjectPermission("projects:manage_members")),
):
    project = await project_service.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        return await project_service.invite_member(db, project_id, user.id, data.user_id, data.role)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.patch("/members/{membership_id}/role", response_model=MemberResponse)
async def update_member_role(
    membership_id: str,
    data: InviteRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_active_user),
):
    pm = await project_service.get_membership_by_id(db, membership_id)
    if not pm:
        raise HTTPException(status_code=404, detail="Membership not found")
    if not await check_project_permission(db, user, pm.project_id, "projects:manage_members"):
        raise HTTPException(status_code=403, detail="Missing project permission: projects:manage_members")
    pm = await project_service.update_member_role(db, membership_id, data.role)
    if not pm:
        raise HTTPException(status_code=404, detail="Membership not found or cannot change owner role")
    return pm


@router.delete("/members/{membership_id}", status_code=204)
async def remove_member(
    membership_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_active_user),
):
    pm = await project_service.get_membership_by_id(db, membership_id)
    if not pm:
        raise HTTPException(status_code=404, detail="Membership not found")
    if not await check_project_permission(db, user, pm.project_id, "projects:manage_members"):
        raise HTTPException(status_code=403, detail="Missing project permission: projects:manage_members")
    removed = await project_service.remove_member(db, membership_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Membership not found or cannot remove owner")
