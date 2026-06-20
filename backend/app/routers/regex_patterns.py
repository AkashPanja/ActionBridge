import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import RequirePermission, get_current_active_user
from app.database import get_db
from app.models.regex_pattern import RegexPattern
from app.schemas.regex_pattern import (
    RegexPatternCreate,
    RegexPatternResponse,
    RegexPatternUpdate,
)

router = APIRouter(
    prefix="/api/v1/regex-patterns",
    tags=["Regex Patterns"],
)


def _build_regex(pattern: str, flags: str) -> re.Pattern:
    flag_mask = 0
    if "i" in flags:
        flag_mask |= re.IGNORECASE
    if "m" in flags:
        flag_mask |= re.MULTILINE
    if "s" in flags:
        flag_mask |= re.DOTALL
    return re.compile(pattern, flag_mask)


async def _get_pattern(db: AsyncSession, pattern_id: str) -> RegexPattern:
    result = await db.execute(
        select(RegexPattern).where(RegexPattern.id == pattern_id)
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Regex pattern not found")
    return p


@router.post("", response_model=RegexPatternResponse, status_code=201)
async def create_pattern(
    data: RegexPatternCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(RequirePermission("users:manage")),
):
    existing = await db.execute(
        select(RegexPattern).where(RegexPattern.name == data.name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="A pattern with this name already exists")

    pattern = RegexPattern(
        name=data.name,
        pattern=data.pattern,
        flags=data.flags,
        description=data.description,
    )
    db.add(pattern)
    await db.commit()
    await db.refresh(pattern)
    return pattern


@router.get("", response_model=list[RegexPatternResponse])
async def list_patterns(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_active_user),
):
    result = await db.execute(
        select(RegexPattern).order_by(RegexPattern.name.asc())
    )
    return list(result.scalars().all())


@router.get("/{pattern_id}", response_model=RegexPatternResponse)
async def get_pattern(
    pattern_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_active_user),
):
    return await _get_pattern(db, pattern_id)


@router.patch("/{pattern_id}", response_model=RegexPatternResponse)
async def update_pattern(
    pattern_id: str,
    data: RegexPatternUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(RequirePermission("users:manage")),
):
    pattern = await _get_pattern(db, pattern_id)
    update_data = data.model_dump(exclude_unset=True)

    if "name" in update_data and update_data["name"] != pattern.name:
        existing = await db.execute(
            select(RegexPattern).where(
                RegexPattern.name == update_data["name"],
                RegexPattern.id != pattern_id,
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="A pattern with this name already exists")

    for key, value in update_data.items():
        setattr(pattern, key, value)
    await db.commit()
    await db.refresh(pattern)
    return pattern


@router.delete("/{pattern_id}", status_code=204)
async def delete_pattern(
    pattern_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(RequirePermission("users:manage")),
):
    pattern = await _get_pattern(db, pattern_id)
    await db.delete(pattern)
    await db.commit()
