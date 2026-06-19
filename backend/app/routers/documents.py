from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import RequirePermission, get_current_active_user, get_current_user_or_api_key
from app.database import get_db
from app.models.document_type import DocumentType
from app.schemas.document import (
    DocumentListResponse,
    DocumentResponse,
    DocumentSubmit,
    DocumentUpdate,
)
from app.services import document_service

router = APIRouter(prefix="/api/v1/projects/{project_id}/documents", tags=["Documents"])


@router.post("/document-types/{type_id}", response_model=DocumentResponse, status_code=201)
async def submit_document(
    project_id: str,
    type_id: str,
    data: DocumentSubmit,
    db: AsyncSession = Depends(get_db),
    auth = Depends(get_current_user_or_api_key),
):
    actor = getattr(auth, "email", "rpa_bot")
    result = await document_service.submit_document(
        db, project_id, type_id, data.extracted_data, data.confidence_scores, actor
    )
    if isinstance(result, str):
        raise HTTPException(status_code=400, detail=result)
    history = await document_service.get_document_history(db, result.id)
    return DocumentResponse(
        **{k: v for k, v in result.__dict__.items() if k != "_sa_instance_state"},
        history=history,
    )


@router.get("", response_model=list[DocumentListResponse])
async def list_documents(
    project_id: str,
    status: str | None = Query(None),
    document_type_id: str | None = Query(None),
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    user = Depends(RequirePermission("documents:read")),
):
    docs = await document_service.list_documents(db, project_id, status, document_type_id, search)
    result = []
    for doc in docs:
        dt = None
        if doc.document_type_id:
            result2 = await db.execute(
                select(DocumentType).where(DocumentType.id == doc.document_type_id)
            )
            dt = result2.scalar_one_or_none()
        result.append(DocumentListResponse(
            **{k: v for k, v in doc.__dict__.items() if k != "_sa_instance_state"},
            document_type_name=dt.name if dt else None,
        ))
    return result


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    project_id: str,
    document_id: str,
    include_history: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    user = Depends(RequirePermission("documents:read")),
):
    doc = await document_service.get_document(db, document_id, include_history)
    if not doc or doc.project_id != project_id:
        raise HTTPException(status_code=404, detail="Document not found")
    history = None
    if include_history:
        history = await document_service.get_document_history(db, document_id)
    return DocumentResponse(
        **{k: v for k, v in doc.__dict__.items() if k != "_sa_instance_state"},
        history=history,
    )


@router.patch("/{document_id}", response_model=DocumentResponse)
async def update_document(
    project_id: str,
    document_id: str,
    data: DocumentUpdate,
    db: AsyncSession = Depends(get_db),
    actor: str = Query("user"),
    user = Depends(RequirePermission("documents:write")),
):
    doc = await document_service.get_document(db, document_id)
    if not doc or doc.project_id != project_id:
        raise HTTPException(status_code=404, detail="Document not found")
    result = await document_service.update_document(
        db, document_id, data.extracted_data, data.status, data.comment, actor
    )
    if isinstance(result, str):
        raise HTTPException(status_code=400, detail=result)
    if result is None:
        raise HTTPException(status_code=404, detail="Document not found")
    history = await document_service.get_document_history(db, document_id)
    return DocumentResponse(
        **{k: v for k, v in result.__dict__.items() if k != "_sa_instance_state"},
        history=history,
    )
