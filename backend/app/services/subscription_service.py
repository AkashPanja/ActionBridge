from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document_subscription import DocTypeSubscription


async def list_subscriptions(db: AsyncSession, user_id: str) -> list[DocTypeSubscription]:
    result = await db.execute(
        select(DocTypeSubscription)
        .where(DocTypeSubscription.user_id == user_id)
        .order_by(DocTypeSubscription.created_at.desc())
    )
    return list(result.scalars().all())


async def set_subscription(
    db: AsyncSession, user_id: str, document_type_id: str, notify_on: list[str]
) -> DocTypeSubscription:
    result = await db.execute(
        select(DocTypeSubscription).where(
            DocTypeSubscription.user_id == user_id,
            DocTypeSubscription.document_type_id == document_type_id,
        )
    )
    sub = result.scalar_one_or_none()
    if sub:
        sub.notify_on = notify_on
    else:
        sub = DocTypeSubscription(
            user_id=user_id,
            document_type_id=document_type_id,
            notify_on=notify_on,
        )
        db.add(sub)
    await db.commit()
    await db.refresh(sub)
    return sub


async def remove_subscription(db: AsyncSession, sub_id: str, user_id: str) -> bool:
    result = await db.execute(
        select(DocTypeSubscription).where(
            DocTypeSubscription.id == sub_id,
            DocTypeSubscription.user_id == user_id,
        )
    )
    sub = result.scalar_one_or_none()
    if not sub:
        return False
    await db.delete(sub)
    await db.commit()
    return True
