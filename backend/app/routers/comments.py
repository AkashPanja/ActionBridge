from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.auth.deps import get_current_active_user
from app.auth.models import User
from app.auth.permissions import RequireProjectPermission, check_project_permission
from app.database import get_db
from app.models.document_comment import DocumentComment
from app.schemas.document_comment import CommentCreate, CommentResponse, CommentUpdate

router = APIRouter(prefix="/api/v1/projects/{project_id}/documents/{document_id}/comments", tags=["Comments"])


@router.get("", response_model=list[CommentResponse])
async def list_comments(
    project_id: str,
    document_id: str,
    db: AsyncSession = Depends(get_db),
    user = Depends(RequireProjectPermission("documents:comment")),
):
    result = await db.execute(
        select(DocumentComment)
        .where(DocumentComment.document_id == document_id)
        .order_by(DocumentComment.created_at.asc())
    )
    comments = list(result.scalars().all())

    # Populate author names
    user_ids = list(set(c.user_id for c in comments))
    users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
    user_map = {u.id: u.name for u in users_result.scalars().all()}

    top_level = [c for c in comments if not c.parent_id]
    replies_map: dict[str, list[DocumentComment]] = {}
    for c in comments:
        if c.parent_id:
            replies_map.setdefault(c.parent_id, []).append(c)

    def to_response(c: DocumentComment) -> CommentResponse:
        return CommentResponse(
            id=c.id,
            document_id=c.document_id,
            user_id=c.user_id,
            parent_id=c.parent_id,
            content=c.content,
            created_at=c.created_at,
            updated_at=c.updated_at,
            author_name=user_map.get(c.user_id, "Unknown"),
            replies=[to_response(r) for r in replies_map.get(c.id, [])],
        )

    return [to_response(c) for c in top_level]


@router.post("", response_model=CommentResponse, status_code=201)
async def create_comment(
    project_id: str,
    document_id: str,
    data: CommentCreate,
    db: AsyncSession = Depends(get_db),
    user = Depends(RequireProjectPermission("documents:comment")),
):
    if data.parent_id:
        parent = await db.get(DocumentComment, data.parent_id)
        if not parent or parent.document_id != document_id:
            raise HTTPException(status_code=404, detail="Parent comment not found")

    comment = DocumentComment(
        document_id=document_id,
        user_id=user.id,
        parent_id=data.parent_id,
        content=data.content,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return CommentResponse(
        id=comment.id,
        document_id=comment.document_id,
        user_id=comment.user_id,
        parent_id=comment.parent_id,
        content=comment.content,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        author_name=user.name,
    )


@router.patch("/{comment_id}", response_model=CommentResponse)
async def update_comment(
    project_id: str,
    document_id: str,
    comment_id: str,
    data: CommentUpdate,
    db: AsyncSession = Depends(get_db),
    user = Depends(RequireProjectPermission("documents:comment")),
):
    result = await db.execute(
        select(DocumentComment).where(
            DocumentComment.id == comment_id,
            DocumentComment.document_id == document_id,
        )
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != user.id:
        raise HTTPException(status_code=403, detail="Cannot edit another user's comment")
    comment.content = data.content
    await db.commit()
    await db.refresh(comment)
    return CommentResponse(
        id=comment.id,
        document_id=comment.document_id,
        user_id=comment.user_id,
        parent_id=comment.parent_id,
        content=comment.content,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        author_name=user.name,
    )


@router.delete("/{comment_id}", status_code=204)
async def delete_comment(
    project_id: str,
    document_id: str,
    comment_id: str,
    db: AsyncSession = Depends(get_db),
    user = Depends(RequireProjectPermission("documents:comment")),
):
    result = await db.execute(
        select(DocumentComment).where(
            DocumentComment.id == comment_id,
            DocumentComment.document_id == document_id,
        )
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != user.id:
        if not await check_project_permission(db, user, project_id, "documents:write"):
            raise HTTPException(status_code=403, detail="Cannot delete another user's comment")
    await db.delete(comment)
    await db.commit()
