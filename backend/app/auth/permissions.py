from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_active_user
from app.auth.models import User
from app.database import get_db
from app.models.project import Project
from app.models.audit_log import AuditLog
from app.models.project_membership import ProjectMembership

PROJECT_PERMISSION_MATRIX = {
    "projects:read": ["owner", "editor", "approver", "viewer"],
    "projects:write": ["owner", "editor"],
    "projects:delete": ["owner"],
    "projects:manage_members": ["owner"],
    "document_types:read": ["owner", "editor", "approver", "viewer"],
    "document_types:write": ["owner", "editor"],
    "documents:read": ["owner", "editor", "approver", "viewer"],
    "documents:write": ["owner", "editor"],
    "documents:approve": ["owner", "approver"],
    "documents:delete": ["owner", "editor"],
    "documents:comment": ["owner", "editor", "approver", "viewer"],
    "documents:attach": ["owner", "editor", "approver"],
    "documents:submit": ["owner", "editor"],
    "api_keys:manage": ["owner"],
}


async def get_accepted_membership(
    db: AsyncSession, user_id: str, project_id: str
) -> ProjectMembership | None:
    result = await db.execute(
        select(ProjectMembership).where(
            ProjectMembership.user_id == user_id,
            ProjectMembership.project_id == project_id,
            ProjectMembership.status == "accepted",
        )
    )
    return result.scalar_one_or_none()


async def check_project_permission(
    db: AsyncSession,
    user: User,
    project_id: str,
    action: str,
    log_admin_bypass: bool = True,
) -> bool:
    if user.role == "admin":
        if log_admin_bypass:
            log = AuditLog(
                actor_id=user.id,
                action="admin_bypass",
                target_type="project",
                target_id=project_id,
                details={"action": action},
            )
            db.add(log)
            await db.commit()
        return True

    # Public projects are readable by any authenticated user
    if action in ("projects:read", "documents:read", "document_types:read"):
        result = await db.execute(
            select(Project).where(Project.id == project_id, Project.is_deleted == False)
        )
        project = result.scalar_one_or_none()
        if project and project.visibility == "public":
            return True

    membership = await get_accepted_membership(db, user.id, project_id)
    if membership is None:
        return False

    required_levels = PROJECT_PERMISSION_MATRIX.get(action, [])
    return membership.access_level in required_levels


class RequireProjectPermission:
    def __init__(self, action: str, log_admin_bypass: bool = True):
        self.action = action
        self.log_admin_bypass = log_admin_bypass

    async def __call__(
        self,
        request: Request,
        user: User = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        project_id = (
            request.path_params.get("project_id")
            or request.path_params.get("id")
        )
        if not project_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Project ID not found in request path",
            )
        if not await check_project_permission(
            db, user, project_id, self.action, self.log_admin_bypass
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing project permission: {self.action}",
            )
        return user
