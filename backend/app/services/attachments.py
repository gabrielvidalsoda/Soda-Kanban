import logging
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.models import Attachment, NotificationEventType, NotificationPreference, User
from app.services.permissions import get_card_with_board, require_board_write
from app.services.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)
settings = get_settings()
PENDING_ATTACHMENT_TTL = timedelta(hours=1)

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


def _attachments_bucket():
    return get_supabase_client().storage.from_(settings.supabase_attachments_bucket)


def _avatars_bucket():
    return get_supabase_client().storage.from_(settings.supabase_avatars_bucket)


def delete_storage_object(bucket_name: str, storage_path: str) -> None:
    try:
        get_supabase_client().storage.from_(bucket_name).remove([storage_path])
    except Exception:
        logger.exception("Failed to delete storage object %s/%s", bucket_name, storage_path)


def _validate_attachment_size(size_bytes: int) -> None:
    if size_bytes > settings.max_attachment_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is too large (max 10MB)",
        )


async def cleanup_stale_pending_attachments(db: AsyncSession, card_id: uuid.UUID) -> None:
    cutoff = datetime.now(UTC) - PENDING_ATTACHMENT_TTL
    await db.execute(
        delete(Attachment).where(
            Attachment.card_id == card_id,
            Attachment.size_bytes.is_(None),
            Attachment.created_at < cutoff,
        )
    )


async def create_presigned_upload(
    db: AsyncSession,
    card_id: uuid.UUID,
    user: User,
    filename: str,
    content_type: str | None,
    size_bytes: int,
) -> tuple[Attachment, str]:
    card = await get_card_with_board(db, card_id)
    if not card:
        raise ValueError("Card not found")
    await require_board_write(db, card.board_list.board_id, user)
    _validate_attachment_size(size_bytes)

    await cleanup_stale_pending_attachments(db, card_id)

    attachment_id = uuid.uuid4()
    storage_path = f"workspaces/cards/{card_id}/{attachment_id}-{filename}"
    attachment = Attachment(
        id=attachment_id,
        card_id=card_id,
        uploaded_by_id=user.id,
        filename=filename,
        storage_path=storage_path,
        content_type=content_type,
    )
    db.add(attachment)
    await db.flush()

    bucket = _attachments_bucket()
    result = bucket.create_signed_upload_url(storage_path)
    upload_url = result.get("signedUrl") or result.get("signedURL")
    if not upload_url:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not create upload URL",
        )
    return attachment, upload_url


async def confirm_attachment(
    db: AsyncSession, card_id: uuid.UUID, attachment_id: uuid.UUID, user: User
) -> Attachment:
    card = await get_card_with_board(db, card_id)
    if not card:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")
    await require_board_write(db, card.board_list.board_id, user)

    result = await db.execute(
        select(Attachment).where(Attachment.id == attachment_id, Attachment.card_id == card_id)
    )
    attachment = result.scalar_one_or_none()
    if not attachment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")

    bucket = _attachments_bucket()
    try:
        files = bucket.list(path=attachment.storage_path.rsplit("/", 1)[0])
        uploaded = next(
            (f for f in files if f.get("name") == attachment.storage_path.split("/")[-1]),
            None,
        )
    except Exception as exc:
        logger.exception("Failed to verify upload for %s", attachment.storage_path)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not verify upload",
        ) from exc

    if not uploaded:
        await db.delete(attachment)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")

    metadata = uploaded.get("metadata") or {}
    content_length = int(metadata.get("size") or uploaded.get("size") or 0)
    if content_length <= 0:
        await db.delete(attachment)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")

    if content_length > settings.max_attachment_bytes:
        delete_storage_object(settings.supabase_attachments_bucket, attachment.storage_path)
        await db.delete(attachment)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is too large (max 10MB)",
        )

    attachment.size_bytes = content_length
    await db.flush()
    return attachment


async def create_presigned_download(attachment: Attachment) -> str:
    bucket = _attachments_bucket()
    result = bucket.create_signed_url(
        attachment.storage_path,
        settings.presigned_url_expire_seconds,
    )
    signed_url = result.get("signedUrl") or result.get("signedURL")
    if not signed_url:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not create download URL",
        )
    return signed_url


async def is_notification_enabled(
    db: AsyncSession, user_id: uuid.UUID, event_type: NotificationEventType
) -> bool:
    result = await db.execute(
        select(NotificationPreference).where(
            NotificationPreference.user_id == user_id,
            NotificationPreference.event_type == event_type,
        )
    )
    pref = result.scalar_one_or_none()
    return pref.email_enabled if pref else True


async def notify_user(
    db: AsyncSession,
    user: User,
    event_type: NotificationEventType,
    subject: str,
    body: str,
) -> None:
    from app.services.email import send_email

    if await is_notification_enabled(db, user.id, event_type):
        await send_email(user.email, subject, body)


async def ensure_default_notification_preferences(db: AsyncSession, user_id: uuid.UUID) -> None:
    for event_type in NotificationEventType:
        result = await db.execute(
            select(NotificationPreference).where(
                NotificationPreference.user_id == user_id,
                NotificationPreference.event_type == event_type,
            )
        )
        if not result.scalar_one_or_none():
            db.add(
                NotificationPreference(
                    user_id=user_id,
                    event_type=event_type,
                    email_enabled=True,
                )
            )


def avatar_storage_path(user_id: uuid.UUID, extension: str) -> str:
    return f"{user_id}{extension}"


async def save_avatar(user_id: uuid.UUID, file: UploadFile) -> str:
    content_type = file.content_type or ""
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Avatar must be a JPEG, PNG, WebP, or GIF image",
        )

    data = await file.read()
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")
    if len(data) > settings.max_avatar_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image is too large (max 5MB)")

    extension = EXTENSIONS[content_type]
    storage_path = avatar_storage_path(user_id, extension)
    bucket = _avatars_bucket()

    for ext in EXTENSIONS.values():
        old_path = avatar_storage_path(user_id, ext)
        if old_path != storage_path:
            try:
                bucket.remove([old_path])
            except Exception:
                pass

    bucket.upload(
        storage_path,
        data,
        file_options={"content-type": content_type, "upsert": "true"},
    )
    return storage_path


async def create_avatar_signed_url(storage_path: str) -> str | None:
    bucket = _avatars_bucket()
    try:
        result = bucket.create_signed_url(storage_path, settings.presigned_url_expire_seconds)
        return result.get("signedUrl") or result.get("signedURL")
    except Exception:
        logger.exception("Failed to create avatar signed URL for %s", storage_path)
        return None
