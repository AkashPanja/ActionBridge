from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document_type import DocumentType
from app.schemas.document_type import DocumentTypeCreate, DocumentTypeUpdate
from app.services.project_service import get_project


async def create_document_type(
    db: AsyncSession, project_id: str, data: DocumentTypeCreate
) -> DocumentType | None:
    project = await get_project(db, project_id)
    if not project:
        return None
    doc_type = DocumentType(
        project_id=project_id,
        name=data.name,
        schema_definition=data.schema_definition,
        validation_rules=data.validation_rules,
    )
    db.add(doc_type)
    await db.commit()
    await db.refresh(doc_type)
    return doc_type


async def get_document_type(db: AsyncSession, type_id: str) -> DocumentType | None:
    result = await db.execute(
        select(DocumentType).where(
            DocumentType.id == type_id, DocumentType.is_deleted == False
        )
    )
    return result.scalar_one_or_none()


async def list_document_types(
    db: AsyncSession, project_id: str
) -> list[DocumentType]:
    result = await db.execute(
        select(DocumentType)
        .where(
            DocumentType.project_id == project_id,
            DocumentType.is_deleted == False,
        )
        .order_by(DocumentType.created_at.desc())
    )
    return list(result.scalars().all())


async def update_document_type(
    db: AsyncSession, type_id: str, data: DocumentTypeUpdate
) -> DocumentType | None:
    doc_type = await get_document_type(db, type_id)
    if not doc_type:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(doc_type, key, value)
    await db.commit()
    await db.refresh(doc_type)
    return doc_type


async def delete_document_type(db: AsyncSession, type_id: str) -> bool:
    doc_type = await get_document_type(db, type_id)
    if not doc_type:
        return False
    doc_type.is_deleted = True
    await db.commit()
    return True
