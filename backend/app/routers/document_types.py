from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import RequirePermission, get_current_active_user
from app.database import get_db
from app.schemas.document_type import (
    BulkIds,
    DocumentTypeCreate,
    DocumentTypeResponse,
    DocumentTypeUpdate,
)
from app.services import document_type_service

router = APIRouter(
    prefix="/api/v1/projects/{project_id}/document-types",
    tags=["Document Types"],
)


@router.post("", response_model=DocumentTypeResponse, status_code=201)
async def create_document_type(
    project_id: str,
    data: DocumentTypeCreate,
    db: AsyncSession = Depends(get_db),
    user = Depends(RequirePermission("document_types:write")),
):
    doc_type = await document_type_service.create_document_type(db, project_id, data)
    if not doc_type:
        raise HTTPException(status_code=404, detail="Project not found")
    return doc_type


@router.get("", response_model=list[DocumentTypeResponse])
async def list_document_types(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    user = Depends(get_current_active_user),
):
    return await document_type_service.list_document_types(db, project_id)


@router.get("/{type_id}", response_model=DocumentTypeResponse)
async def get_document_type(
    project_id: str,
    type_id: str,
    db: AsyncSession = Depends(get_db),
    user = Depends(get_current_active_user),
):
    doc_type = await document_type_service.get_document_type(db, type_id)
    if not doc_type or doc_type.project_id != project_id:
        raise HTTPException(status_code=404, detail="Document type not found")
    return doc_type


@router.patch("/{type_id}", response_model=DocumentTypeResponse)
async def update_document_type(
    project_id: str,
    type_id: str,
    data: DocumentTypeUpdate,
    db: AsyncSession = Depends(get_db),
    user = Depends(RequirePermission("document_types:write")),
):
    doc_type = await document_type_service.get_document_type(db, type_id)
    if not doc_type or doc_type.project_id != project_id:
        raise HTTPException(status_code=404, detail="Document type not found")
    try:
        updated = await document_type_service.update_document_type(db, type_id, data)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return updated


@router.post("/bulk-delete", status_code=200)
async def bulk_delete_document_types(
    project_id: str,
    data: BulkIds,
    db: AsyncSession = Depends(get_db),
    user = Depends(RequirePermission("document_types:write")),
):
    count = await document_type_service.bulk_delete_document_types(db, project_id, data.ids)
    return {"deleted": count}


@router.delete("/{type_id}", status_code=204)
async def delete_document_type(
    project_id: str,
    type_id: str,
    db: AsyncSession = Depends(get_db),
    user = Depends(RequirePermission("document_types:write")),
):
    doc_type = await document_type_service.get_document_type(db, type_id)
    if not doc_type or doc_type.project_id != project_id:
        raise HTTPException(status_code=404, detail="Document type not found")
    await document_type_service.delete_document_type(db, type_id)
