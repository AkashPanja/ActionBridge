from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_active_user
from app.database import get_db
from app.services.subscription_service import (
    list_subscriptions,
    remove_subscription,
    set_subscription,
)

router = APIRouter(prefix="/api/v1/subscriptions", tags=["Subscriptions"])


class SubscriptionSet(BaseModel):
    project_id: str
    document_type_id: str
    notify_on: list[str]


@router.get("")
async def list_my_subscriptions(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_active_user),
):
    subs = await list_subscriptions(db, user.id)
    return subs


@router.put("", status_code=200)
async def upsert_subscription(
    data: SubscriptionSet,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_active_user),
):
    sub = await set_subscription(db, user.id, data.project_id, data.document_type_id, data.notify_on)
    return sub


@router.delete("/{sub_id}", status_code=204)
async def delete_subscription(
    sub_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_active_user),
):
    ok = await remove_subscription(db, sub_id, user.id)
    if not ok:
        raise HTTPException(status_code=404, detail="Subscription not found")
