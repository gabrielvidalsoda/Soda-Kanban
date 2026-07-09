import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.config import get_settings
from app.db.models import Attachment, User
from app.db.session import get_db
from app.schemas import AttachmentCreate, AttachmentRead, PresignedUploadResponse
from app.services.attachments import (
    confirm_attachment,
    create_presigned_download,
    create_presigned_upload,
    delete_storage_object,
)
from app.services.permissions import get_card_with_board, require_board_write

settings = get_settings()

router = APIRouter(prefix="/cards/{card_id}/attachments", tags=["attachments"])


@router.get("", response_model=list[AttachmentRead])
async def list_attachments(
    card_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[AttachmentRead]:
    card = await get_card_with_board(db, card_id)
    if not card:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")
    await require_board_write(db, card.board_list.board_id, user)
    result = await db.execute(
        select(Attachment).where(
            Attachment.card_id == card_id,
            Attachment.size_bytes.isnot(None),
        )
    )
    attachments = list(result.scalars().all())
    response = []
    for attachment in attachments:
        item = AttachmentRead.model_validate(attachment)
        item.download_url = await create_presigned_download(attachment)
        response.append(item)
    return response


@router.post("/upload-url", response_model=PresignedUploadResponse)
async def get_upload_url(
    card_id: uuid.UUID,
    payload: AttachmentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PresignedUploadResponse:
    try:
        attachment, upload_url = await create_presigned_upload(
            db,
            card_id,
            user,
            payload.filename,
            payload.content_type,
            payload.size_bytes,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return PresignedUploadResponse(
        upload_url=upload_url,
        attachment_id=attachment.id,
        storage_path=attachment.storage_path,
    )


@router.post("/{attachment_id}/confirm", response_model=AttachmentRead)
async def confirm_upload(
    card_id: uuid.UUID,
    attachment_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AttachmentRead:
    attachment = await confirm_attachment(db, card_id, attachment_id, user)
    item = AttachmentRead.model_validate(attachment)
    item.download_url = await create_presigned_download(attachment)
    return item


@router.delete("/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attachment(
    card_id: uuid.UUID,
    attachment_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
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
    delete_storage_object(settings.supabase_attachments_bucket, attachment.storage_path)
    await db.delete(attachment)
