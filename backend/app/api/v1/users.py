import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db.models import NotificationEventType, NotificationPreference, User
from app.db.session import get_db
from app.schemas import NotificationPreferenceRead, NotificationPreferenceUpdate, UserRead, UserUpdate
from app.services.attachments import create_avatar_signed_url, save_avatar

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
async def get_me(user: User = Depends(get_current_user)) -> User:
    return user


@router.patch("/me", response_model=UserRead)
async def update_me(
    payload: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    if payload.name is not None:
        user.name = payload.name
    if payload.phone is not None:
        user.phone = payload.phone.strip() or None
    await db.flush()
    await db.refresh(user)
    return user


@router.post("/me/avatar", response_model=UserRead)
async def upload_avatar(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    storage_path = await save_avatar(user.id, file)
    user.avatar_url = storage_path
    await db.flush()
    await db.refresh(user)
    return user


@router.get("/me/avatar")
async def get_my_avatar(user: User = Depends(get_current_user)) -> RedirectResponse:
    if not user.avatar_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avatar not found")
    signed_url = await create_avatar_signed_url(user.avatar_url)
    if not signed_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avatar not found")
    return RedirectResponse(url=signed_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)


@router.get("/{user_id}/avatar")
async def get_user_avatar(
    user_id: uuid.UUID,
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target or not target.avatar_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avatar not found")
    signed_url = await create_avatar_signed_url(target.avatar_url)
    if not signed_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avatar not found")
    return RedirectResponse(url=signed_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)


@router.get("/me/notification-preferences", response_model=list[NotificationPreferenceRead])
async def get_notification_preferences(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[NotificationPreferenceRead]:
    result = await db.execute(
        select(NotificationPreference).where(NotificationPreference.user_id == user.id)
    )
    prefs = {p.event_type: p for p in result.scalars().all()}
    return [
        NotificationPreferenceRead(
            event_type=event_type,
            email_enabled=prefs[event_type].email_enabled if event_type in prefs else True,
        )
        for event_type in NotificationEventType
    ]


@router.patch("/me/notification-preferences", response_model=list[NotificationPreferenceRead])
async def update_notification_preferences(
    payload: NotificationPreferenceUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[NotificationPreferenceRead]:
    for pref in payload.preferences:
        result = await db.execute(
            select(NotificationPreference).where(
                NotificationPreference.user_id == user.id,
                NotificationPreference.event_type == pref.event_type,
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            existing.email_enabled = pref.email_enabled
        else:
            db.add(
                NotificationPreference(
                    user_id=user.id,
                    event_type=pref.event_type,
                    email_enabled=pref.email_enabled,
                )
            )
    await db.flush()
    return await get_notification_preferences(user, db)
