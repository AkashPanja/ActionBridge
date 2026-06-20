from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_active_user
from app.database import get_db
from app.services import project_service

router = APIRouter(prefix="/api/v1/invitations", tags=["Invitations"])


@router.get("")
async def list_pending_invitations(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_active_user),
):
    return await project_service.list_pending_invitations(db, user.id)


@router.post("/{membership_id}/accept")
async def accept_invitation(
    membership_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_active_user),
):
    pm = await project_service.accept_invitation(db, membership_id, user.id)
    if not pm:
        raise HTTPException(status_code=404, detail="Invitation not found or already responded")
    return {"status": "accepted"}


@router.post("/{membership_id}/decline")
async def decline_invitation(
    membership_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_active_user),
):
    ok = await project_service.decline_invitation(db, membership_id, user.id)
    if not ok:
        raise HTTPException(status_code=404, detail="Invitation not found or already responded")
    return {"status": "declined"}
