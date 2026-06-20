import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import RequirePermission, get_current_active_user
from app.config import settings
from app.database import get_db
from app.models.document_attachment import DocumentAttachment
from app.models.document_instance import DocumentInstance

router = APIRouter(prefix="/api/v1/attachments", tags=["Attachments"])

UPLOAD_DIR = Path(settings.upload_dir) / "attachments"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/gif",
    "text/plain",
    "text/csv",
    "application/json",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


@router.post("/{document_id}", status_code=201)
async def upload_attachment(
    document_id: str,
    file: UploadFile,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_active_user),
):
    doc = await db.get(DocumentInstance, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file.content_type}' not allowed. Allowed: {', '.join(sorted(ALLOWED_MIME_TYPES))}",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum size of {MAX_FILE_SIZE // (1024 * 1024)} MB",
        )

    ext = Path(file.filename).suffix if file.filename else ""
    stored_name = f"{uuid.uuid4()}{ext}"
    file_path = UPLOAD_DIR / stored_name

    with open(file_path, "wb") as f:
        f.write(content)

    attachment = DocumentAttachment(
        document_id=document_id,
        file_name=file.filename or stored_name,
        file_path=str(file_path),
        mime_type=file.content_type or "application/octet-stream",
        file_size=len(content),
    )
    db.add(attachment)
    await db.commit()
    await db.refresh(attachment)

    return {
        "id": attachment.id,
        "file_name": attachment.file_name,
        "mime_type": attachment.mime_type,
        "file_size": attachment.file_size,
        "created_at": attachment.created_at,
    }


@router.get("/{document_id}")
async def list_attachments(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_active_user),
):
    result = await db.execute(
        select(DocumentAttachment)
        .where(DocumentAttachment.document_id == document_id)
        .order_by(DocumentAttachment.created_at.desc())
    )
    return result.scalars().all()


@router.delete("/{attachment_id}", status_code=204)
async def delete_attachment(
    attachment_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(RequirePermission("documents:write")),
):
    result = await db.execute(
        select(DocumentAttachment).where(DocumentAttachment.id == attachment_id)
    )
    att = result.scalar_one_or_none()
    if not att:
        raise HTTPException(status_code=404, detail="Attachment not found")
    try:
        os.remove(att.file_path)
    except OSError:
        pass
    await db.delete(att)
    await db.commit()
