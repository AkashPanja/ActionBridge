from datetime import datetime, timedelta, timezone

from sqlalchemy import case, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings

from app.auth.models import User
from app.models.audit_event import AuditEvent
from app.models.document_instance import DocumentInstance
from app.models.document_subscription import DocTypeSubscription
from app.models.document_type import DocumentType
from app.models.notification import Notification
from app.models.project import Project
from app.models.project_membership import ProjectMembership
from app.schemas.project import ProjectCreate, ProjectUpdate


async def create_project(
    db: AsyncSession, data: ProjectCreate, user_id: str | None = None
) -> Project:
    existing = await db.execute(
        select(Project).where(Project.name == data.name, Project.is_deleted == False)
    )
    if existing.scalar_one_or_none():
        raise ValueError(f"Project with name '{data.name}' already exists")
    project = Project(
        name=data.name,
        description=data.description,
        created_by=user_id,
        visibility=data.visibility or "private",
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)

    if user_id:
        membership = ProjectMembership(
            project_id=project.id,
            user_id=user_id,
            role="owner",
            status="accepted",
        )
        db.add(membership)
        await db.commit()

    return project


async def get_project(db: AsyncSession, project_id: str) -> Project | None:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.is_deleted == False)
    )
    return result.scalar_one_or_none()


async def list_projects(
    db: AsyncSession, search: str | None = None, user_id: str | None = None, is_admin: bool = False
) -> list[Project]:
    query = select(Project).where(Project.is_deleted == False)

    if not is_admin and user_id:
        # User sees: public projects + projects they are an accepted member of
        subq = (
            select(ProjectMembership.project_id)
            .where(
                ProjectMembership.user_id == user_id,
                ProjectMembership.status == "accepted",
            )
            .scalar_subquery()
        )
        query = query.where(
            or_(Project.visibility == "public", Project.id.in_(subq))
        )

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
    if "name" in update_data and update_data["name"] != project.name:
        existing = await db.execute(
            select(Project).where(
                Project.name == update_data["name"],
                Project.is_deleted == False,
                Project.id != project_id,
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError(f"Project with name '{update_data['name']}' already exists")
    for key, value in update_data.items():
        setattr(project, key, value)
    await db.commit()
    await db.refresh(project)
    return project


async def get_project_stats(db: AsyncSession, project_id: str) -> dict:
    total = (
        await db.scalar(
            select(func.count(DocumentInstance.id)).where(
                DocumentInstance.project_id == project_id,
                DocumentInstance.is_deleted == False,
            )
        )
        or 0
    )

    status_rows = await db.execute(
        select(DocumentInstance.status, func.count(DocumentInstance.id).label("cnt"))
        .where(
            DocumentInstance.project_id == project_id,
            DocumentInstance.is_deleted == False,
        )
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
        .where(
            DocumentInstance.project_id == project_id,
            DocumentInstance.is_deleted == False,
        )
        .group_by(DocumentType.id)
    )
    by_document_type = [{"name": row.name, "count": row.cnt} for row in type_rows]

    if settings.is_postgres:
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=6)
    else:
        seven_days_ago = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=6)
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
        .order_by(func.date(DocumentInstance.created_at))
    )
    daily_volume = [
        {"date": str(row.date), "status": row.status, "count": row.cnt}
        for row in daily_rows
    ]

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


async def bulk_delete_projects(db: AsyncSession, ids: list[str]) -> int:
    result = await db.execute(
        update(Project)
        .where(Project.id.in_(ids), Project.is_deleted == False)
        .values(is_deleted=True)
    )
    await db.commit()
    return result.rowcount


async def list_members(db: AsyncSession, project_id: str) -> list[dict]:
    result = await db.execute(
        select(ProjectMembership, User.name, User.email)
        .join(User, ProjectMembership.user_id == User.id)
        .where(ProjectMembership.project_id == project_id)
        .order_by(ProjectMembership.created_at.desc())
    )
    members = []
    for row in result.all():
        pm, uname, uemail = row
        members.append({
            "id": pm.id,
            "project_id": pm.project_id,
            "user_id": pm.user_id,
            "role": pm.role,
            "status": pm.status,
            "invited_by": pm.invited_by,
            "user_name": uname,
            "user_email": uemail,
            "created_at": pm.created_at,
        })
    return members


async def invite_member(
    db: AsyncSession, project_id: str, inviter_id: str, invitee_id: str, role: str = "viewer"
) -> ProjectMembership:
    existing = await db.execute(
        select(ProjectMembership).where(
            ProjectMembership.project_id == project_id,
            ProjectMembership.user_id == invitee_id,
        )
    )
    if existing.scalar_one_or_none():
        raise ValueError("User is already a member or has a pending invitation")

    pm = ProjectMembership(
        project_id=project_id,
        user_id=invitee_id,
        role=role,
        status="pending",
        invited_by=inviter_id,
    )
    db.add(pm)
    await db.commit()
    await db.refresh(pm)

    # In-app notification
    from app.auth.service import get_setting
    inviter = await db.get(User, inviter_id)
    project = await db.get(Project, project_id)
    notif = Notification(
        user_id=invitee_id,
        type="project_invitation",
        title=f"Invitation to {project.name}",
        message=f"{inviter.name} invited you to join project '{project.name}' as {role}.",
    )
    db.add(notif)
    await db.commit()

    return pm


async def accept_invitation(db: AsyncSession, membership_id: str, user_id: str) -> ProjectMembership | None:
    result = await db.execute(
        select(ProjectMembership).where(
            ProjectMembership.id == membership_id,
            ProjectMembership.user_id == user_id,
            ProjectMembership.status == "pending",
        )
    )
    pm = result.scalar_one_or_none()
    if not pm:
        return None
    pm.status = "accepted"
    await db.commit()
    await db.refresh(pm)
    return pm


async def decline_invitation(db: AsyncSession, membership_id: str, user_id: str) -> bool:
    result = await db.execute(
        select(ProjectMembership).where(
            ProjectMembership.id == membership_id,
            ProjectMembership.user_id == user_id,
            ProjectMembership.status == "pending",
        )
    )
    pm = result.scalar_one_or_none()
    if not pm:
        return False
    pm.status = "declined"
    await db.commit()
    return True


async def remove_member(db: AsyncSession, membership_id: str) -> bool:
    result = await db.execute(
        select(ProjectMembership).where(ProjectMembership.id == membership_id)
    )
    pm = result.scalar_one_or_none()
    if not pm or pm.role == "owner":
        return False
    await db.delete(pm)
    await db.commit()
    return True


async def update_member_role(db: AsyncSession, membership_id: str, role: str) -> ProjectMembership | None:
    result = await db.execute(
        select(ProjectMembership).where(ProjectMembership.id == membership_id)
    )
    pm = result.scalar_one_or_none()
    if not pm or pm.role == "owner":
        return None
    pm.role = role
    await db.commit()
    await db.refresh(pm)
    return pm


async def list_pending_invitations(db: AsyncSession, user_id: str) -> list[dict]:
    result = await db.execute(
        select(ProjectMembership, Project.name)
        .join(Project, ProjectMembership.project_id == Project.id)
        .where(
            ProjectMembership.user_id == user_id,
            ProjectMembership.status == "pending",
        )
        .order_by(ProjectMembership.created_at.desc())
    )
    return [
        {
            "id": pm.id,
            "project_id": pm.project_id,
            "project_name": pname,
            "role": pm.role,
            "invited_by": pm.invited_by,
            "created_at": pm.created_at,
        }
        for pm, pname in result.all()
    ]


async def get_recent_activity(db: AsyncSession, project_id: str, limit: int = 10) -> list[dict]:
    result = await db.execute(
        select(
            AuditEvent.id,
            AuditEvent.action,
            AuditEvent.actor,
            AuditEvent.comment,
            AuditEvent.timestamp,
            DocumentInstance.document_type_id,
            DocumentType.name.label("document_type_name"),
        )
        .join(DocumentInstance, AuditEvent.document_id == DocumentInstance.id)
        .join(DocumentType, DocumentInstance.document_type_id == DocumentType.id)
        .where(
            DocumentInstance.project_id == project_id,
            DocumentInstance.is_deleted == False,
        )
        .order_by(AuditEvent.timestamp.desc())
        .limit(limit)
    )
    return [
        {
            "id": row.id,
            "action": row.action,
            "actor": row.actor,
            "comment": row.comment,
            "timestamp": row.timestamp,
            "document_type_name": row.document_type_name,
        }
        for row in result.all()
    ]
