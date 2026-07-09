import logging
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.models import (
    BoardMember,
    BoardRole,
    Invitation,
    User,
    WorkspaceMember,
    WorkspaceRole,
)
from app.services.email import send_email

logger = logging.getLogger(__name__)
settings = get_settings()

INVITE_ERROR_MESSAGES = {
    "not_found": "This invite link is invalid. Ask your workspace admin to send a new invitation.",
    "expired": "This invite link has expired. Ask your workspace admin to send a new invitation.",
    "already_used": "This invite link has already been used. Sign in or ask for a new invitation.",
    "email_mismatch": "This invite was sent to a different email address. Register with the invited email or ask for a new invitation.",
}


def _is_shared_link_invite(invitation: Invitation) -> bool:
    """Link-only invites (no email) can be used by multiple people until expiry."""
    return invitation.email is None


async def create_invitation(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    invited_by: User,
    email: str | None = None,
    board_id: uuid.UUID | None = None,
) -> Invitation:
    token = uuid.uuid4().hex
    invitation = Invitation(
        token=token,
        workspace_id=workspace_id,
        invited_by_id=invited_by.id,
        email=email,
        board_id=board_id,
        expires_at=datetime.now(UTC) + timedelta(days=7),
    )
    db.add(invitation)
    await db.flush()

    if email:
        invite_url = f"{settings.frontend_url}/register?token={token}"
        await send_email(
            email,
            "You are invited to SODA KANBAN",
            f"Join your team: {invite_url}",
        )

    return invitation


async def redeem_invitation(db: AsyncSession, token: str, user: User) -> tuple[Invitation | None, str | None]:
    now = datetime.now(UTC)
    result = await db.execute(select(Invitation).where(Invitation.token == token))
    invitation = result.scalar_one_or_none()
    shared_link = invitation is not None and _is_shared_link_invite(invitation)

    if not invitation:
        logger.warning("invite redeem failed: token not found")
        return None, "not_found"

    if invitation.accepted_at and not shared_link:
        logger.warning("invite redeem failed: already accepted")
        return None, "already_used"

    if invitation.expires_at < now:
        logger.warning("invite redeem failed: expired")
        return None, "expired"

    if invitation.email and invitation.email.lower() != user.email.lower():
        logger.warning("invite redeem failed: email mismatch")
        return None, "email_mismatch"

    existing = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == invitation.workspace_id,
            WorkspaceMember.user_id == user.id,
        )
    )
    if existing.scalar_one_or_none():
        if not shared_link:
            invitation.accepted_at = datetime.now(UTC)
            await db.flush()
        return invitation, None

    if not user.workspace_id:
        user.workspace_id = invitation.workspace_id

    db.add(
        WorkspaceMember(
            workspace_id=invitation.workspace_id,
            user_id=user.id,
            role=WorkspaceRole.MEMBER,
        )
    )

    if invitation.board_id:
        board_member = await db.execute(
            select(BoardMember).where(
                BoardMember.board_id == invitation.board_id,
                BoardMember.user_id == user.id,
            )
        )
        if not board_member.scalar_one_or_none():
            db.add(
                BoardMember(
                    board_id=invitation.board_id,
                    user_id=user.id,
                    role=BoardRole.COLLABORATOR,
                )
            )

    if not shared_link:
        invitation.accepted_at = datetime.now(UTC)
    await db.flush()
    return invitation, None
