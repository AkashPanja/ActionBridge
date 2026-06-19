from datetime import datetime, timedelta, timezone

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document_instance import DocumentInstance
from app.models.document_type import DocumentType
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate


async def create_project(db: AsyncSession, data: ProjectCreate) -> Project:
    project = Project(name=data.name, description=data.description)
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


async def get_project(db: AsyncSession, project_id: str) -> Project | None:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.is_deleted == False)
    )
    return result.scalar_one_or_none()


async def list_projects(
    db: AsyncSession, search: str | None = None
) -> list[Project]:
    query = select(Project).where(Project.is_deleted == False)
    if search:
        query = query.where(Project.name.ilike(f"%{search}%"))
    query = query.order_by(Project.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


async def update_project(
    db: AsyncSession, project_id: str, data: ProjectUpdate
) -> Project | None:
    project = await get_project(db, project_id)
    if not project:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)
    await db.commit()
    await db.refresh(project)
    return project


async def get_project_stats(db: AsyncSession, project_id: str) -> dict:
    total = await db.scalar(
        select(func.count(DocumentInstance.id)).where(
            DocumentInstance.project_id == project_id,
            DocumentInstance.is_deleted == False,
        )
    ) or 0

    status_rows = await db.execute(
        select(DocumentInstance.status, func.count(DocumentInstance.id).label("cnt"))
        .where(DocumentInstance.project_id == project_id, DocumentInstance.is_deleted == False)
        .group_by(DocumentInstance.status)
    )
    status_breakdown = [{"status": row.status, "count": row.cnt} for row in status_rows]

    avg_conf = await db.scalar(
        select(func.avg(DocumentInstance.confidence_score)).where(
            DocumentInstance.project_id == project_id,
            DocumentInstance.is_deleted == False,
        )
    )

    type_rows = await db.execute(
        select(DocumentType.name, func.count(DocumentInstance.id).label("cnt"))
        .join(DocumentInstance, DocumentInstance.document_type_id == DocumentType.id)
        .where(DocumentInstance.project_id == project_id, DocumentInstance.is_deleted == False)
        .group_by(DocumentType.id)
    )
    by_document_type = [{"name": row.name, "count": row.cnt} for row in type_rows]

    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=6)
    daily_rows = await db.execute(
        select(
            func.date(DocumentInstance.created_at).label("date"),
            DocumentInstance.status,
            func.count(DocumentInstance.id).label("cnt"),
        )
        .where(
            DocumentInstance.project_id == project_id,
            DocumentInstance.is_deleted == False,
            DocumentInstance.created_at >= seven_days_ago,
        )
        .group_by(func.date(DocumentInstance.created_at), DocumentInstance.status)
        .order_by("date")
    )
    daily_volume = [{"date": str(row.date), "status": row.status, "count": row.cnt} for row in daily_rows]

    return {
        "total_documents": total,
        "status_breakdown": status_breakdown,
        "avg_confidence": round(float(avg_conf), 4) if avg_conf else None,
        "by_document_type": by_document_type,
        "daily_volume": daily_volume,
    }


async def delete_project(db: AsyncSession, project_id: str) -> bool:
    project = await get_project(db, project_id)
    if not project:
        return False
    project.is_deleted = True
    await db.commit()
    return True
