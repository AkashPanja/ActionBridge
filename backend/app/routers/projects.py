from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import RequirePermission, get_current_active_user
from app.database import get_db
from app.schemas.document_type import BulkIds
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectStats, ProjectUpdate
from app.services import project_service

router = APIRouter(prefix="/api/v1/projects", tags=["Projects"])


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    user = Depends(RequirePermission("projects:write")),
):
    try:
        return await project_service.create_project(db, data)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    user = Depends(get_current_active_user),
):
    return await project_service.list_projects(db, search)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    user = Depends(get_current_active_user),
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
    user = Depends(RequirePermission("projects:write")),
):
    try:
        project = await project_service.update_project(db, project_id, data)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("/{project_id}/stats", response_model=ProjectStats)
async def get_project_stats(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    user = Depends(get_current_active_user),
):
    return await project_service.get_project_stats(db, project_id)


@router.post("/bulk-delete", status_code=200)
async def bulk_delete_projects(
    data: BulkIds,
    db: AsyncSession = Depends(get_db),
    user = Depends(RequirePermission("projects:write")),
):
    count = await project_service.bulk_delete_projects(db, data.ids)
    return {"deleted": count}


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    user = Depends(RequirePermission("projects:write")),
):
    deleted = await project_service.delete_project(db, project_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")
