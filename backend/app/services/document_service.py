from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.audit_event import AuditEvent
from app.models.document_instance import DocumentInstance
from app.models.document_type import DocumentType
from app.services.project_service import get_project
from app.utils.fsm import can_edit, validate_transition
from app.utils.json_schema import validate_data_against_schema


async def submit_document(
    db: AsyncSession,
    project_id: str,
    document_type_id: str,
    data: dict,
    confidence_scores: dict | None = None,
    actor: str = "rpa_bot",
) -> DocumentInstance | str:
    project = await get_project(db, project_id)
    if not project:
        return "Project not found"

    doc_type = await db.get(DocumentType, document_type_id)
    if not doc_type or doc_type.project_id != project_id:
        return "Document type not found"

    errors = validate_data_against_schema(data, doc_type.schema_definition)
    if errors:
        return f"Validation failed: {'; '.join(errors)}"

    # Validate that every field in extracted_data has a confidence score
    if confidence_scores:
        for key in data:
            if key not in confidence_scores:
                return f"Missing confidence score for field: '{key}'"
            score = confidence_scores[key]
            if not isinstance(score, (int, float)) or score < 0 or score > 1:
                return f"Invalid confidence score for '{key}': must be between 0 and 1"

    avg_score = None
    if confidence_scores and data:
        avg_score = sum(confidence_scores.values()) / len(confidence_scores)

    doc = DocumentInstance(
        project_id=project_id,
        document_type_id=document_type_id,
        status="received",
        extracted_data=data,
        confidence_score=avg_score,
        confidence_scores=confidence_scores,
    )
    db.add(doc)
    await db.flush()

    audit = AuditEvent(
        document_id=doc.id,
        action="DOCUMENT_CREATED",
        actor=actor,
        new_value=data,
    )
    db.add(audit)

    doc.status = "pending_review"
    audit2 = AuditEvent(
        document_id=doc.id,
        action="STATUS_CHANGED",
        actor="system",
        field_name="status",
        old_value={"status": "received"},
        new_value={"status": "pending_review"},
    )
    db.add(audit2)

    await db.commit()
    await db.refresh(doc)
    return doc


async def get_document(
    db: AsyncSession, document_id: str, include_history: bool = False
) -> DocumentInstance | None:
    query = select(DocumentInstance).where(
        DocumentInstance.id == document_id,
        DocumentInstance.is_deleted == False,
    )
    if include_history:
        query = query.options(joinedload(DocumentInstance.audit_events))
    result = await db.execute(query)
    return result.unique().scalar_one_or_none()


async def list_documents(
    db: AsyncSession,
    project_id: str,
    status: str | None = None,
    document_type_id: str | None = None,
    search: str | None = None,
) -> list[DocumentInstance]:
    query = select(DocumentInstance).where(
        DocumentInstance.project_id == project_id,
        DocumentInstance.is_deleted == False,
    )
    if status:
        query = query.where(DocumentInstance.status == status)
    if document_type_id:
        query = query.where(DocumentInstance.document_type_id == document_type_id)
    if search:
        query = query.where(
            DocumentInstance.extracted_data.astext.ilike(f"%{search}%")
        )
    query = query.order_by(DocumentInstance.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


async def update_document(
    db: AsyncSession,
    document_id: str,
    extracted_data: dict | None = None,
    new_status: str | None = None,
    comment: str | None = None,
    actor: str = "user",
) -> DocumentInstance | str | None:
    doc = await get_document(db, document_id)
    if not doc:
        return None

    if not can_edit(doc.status) and (extracted_data is not None or new_status is not None):
        return "Document is not editable in its current state"

    if extracted_data is not None:
        doc_type = await db.get(DocumentType, doc.document_type_id)
        if doc_type:
            errors = validate_data_against_schema(extracted_data, doc_type.schema_definition)
            if errors:
                return f"Validation failed: {'; '.join(errors)}"

    old_data = dict(doc.extracted_data) if doc.extracted_data else {}

    if extracted_data is not None:
        doc.extracted_data = extracted_data

    if new_status:
        if not validate_transition(doc.status, new_status):
            return f"Cannot transition from {doc.status} to {new_status}"
        audit_status = AuditEvent(
            document_id=doc.id,
            action="STATUS_CHANGED",
            actor=actor,
            field_name="status",
            old_value={"status": doc.status},
            new_value={"status": new_status},
            comment=comment,
        )
        db.add(audit_status)
        doc.status = new_status

    if extracted_data is not None:
        changed_fields = {}
        for key in extracted_data:
            if key not in old_data or old_data[key] != extracted_data[key]:
                changed_fields[key] = {
                    "old": old_data.get(key),
                    "new": extracted_data[key],
                }
        if changed_fields:
            audit_data = AuditEvent(
                document_id=doc.id,
                action="FIELD_UPDATE",
                actor=actor,
                field_name=", ".join(changed_fields.keys()),
                old_value={k: v["old"] for k, v in changed_fields.items()},
                new_value={k: v["new"] for k, v in changed_fields.items()},
                comment=comment,
            )
            db.add(audit_data)

    await db.commit()
    await db.refresh(doc)
    return doc


async def get_document_history(
    db: AsyncSession, document_id: str
) -> list[AuditEvent]:
    result = await db.execute(
        select(AuditEvent)
        .where(AuditEvent.document_id == document_id)
        .order_by(AuditEvent.timestamp.asc())
    )
    return list(result.scalars().all())
