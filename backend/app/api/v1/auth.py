import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, security
from app.auth.jwt import decode_supabase_access_token
from app.db.models import User, Workspace, WorkspaceMember, WorkspaceRole
from app.db.session import get_db
from app.schemas import CompleteRegistrationRequest, UserRead
from app.services.attachments import ensure_default_notification_preferences
from app.services.invitations import INVITE_ERROR_MESSAGES, redeem_invitation

router = APIRouter(prefix="/auth", tags=["auth"])


async def _get_claims_from_credentials(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    claims = decode_supabase_access_token(credentials.credentials)
    if not claims:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return claims


def _user_id_from_claims(claims: dict) -> uuid.UUID:
    try:
        return uuid.UUID(claims["sub"])
    except (KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject",
        ) from exc


@router.get("/me", response_model=UserRead)
async def auth_me(user: User = Depends(get_current_user)) -> User:
    return user


@router.post("/complete-registration", response_model=UserRead)
async def complete_registration(
    payload: CompleteRegistrationRequest,
    claims: dict = Depends(_get_claims_from_credentials),
    db: AsyncSession = Depends(get_db),
) -> User:
    user_id = _user_id_from_claims(claims)
    email = claims.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token missing email claim",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    existing = result.scalar_one_or_none()
    if existing:
        if payload.name and existing.name != payload.name:
            existing.name = payload.name
            await db.flush()
        return UserRead.model_validate(existing)

    email_taken = await db.execute(select(User).where(User.email == email, User.id != user_id))
    if email_taken.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered to another account",
        )

    user = User(id=user_id, email=email, name=payload.name)
    db.add(user)
    await db.flush()
    await ensure_default_notification_preferences(db, user.id)

    if payload.invite_token:
        invitation, invite_error = await redeem_invitation(db, payload.invite_token, user)
        if not invitation:
            detail = INVITE_ERROR_MESSAGES.get(invite_error or "not_found", "Invalid invite token")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)
    else:
        workspace = Workspace(name=f"{payload.name}'s Workspace", owner_id=user.id)
        db.add(workspace)
        await db.flush()
        user.workspace_id = workspace.id
        db.add(
            WorkspaceMember(
                workspace_id=workspace.id,
                user_id=user.id,
                role=WorkspaceRole.OWNER,
            )
        )

    if not user.workspace_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration requires a workspace invitation",
        )

    await db.flush()
    return UserRead.model_validate(user)
