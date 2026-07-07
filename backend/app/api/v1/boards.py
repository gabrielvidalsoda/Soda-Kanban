import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.dependencies import get_current_user
from app.config import get_settings
from app.db.models import Board, BoardList, BoardMember, BoardRole, Card, User
from app.db.session import get_db
from app.schemas import (
    BoardCreate,
    BoardDetailRead,
    BoardMemberRead,
    BoardMemberUpdate,
    BoardRead,
    BoardUpdate,
    ListRead,
)
from app.constants.board_workflow import DEFAULT_BOARD_LISTS
from app.services.card_dependencies import load_dependency_ids_map
from app.services.cards import build_card_read
from app.services.permissions import (
    require_board_admin,
    require_board_view,
    require_workspace_member,
)

router = APIRouter(tags=["boards"])
settings = get_settings()


@router.get("/workspaces/{workspace_id}/boards", response_model=list[BoardRead])
async def list_boards(
    workspace_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Board]:
    await require_workspace_member(db, workspace_id, user)
    result = await db.execute(
        select(Board).where(Board.workspace_id == workspace_id).order_by(Board.position)
    )
    return list(result.scalars().all())


@router.post("/workspaces/{workspace_id}/boards", response_model=BoardRead, status_code=status.HTTP_201_CREATED)
async def create_board(
    workspace_id: uuid.UUID,
    payload: BoardCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Board:
    await require_workspace_member(db, workspace_id, user)
    count = await db.execute(
        select(func.count()).select_from(Board).where(Board.workspace_id == workspace_id)
    )
    board = Board(
        workspace_id=workspace_id,
        name=payload.name,
        visibility=payload.visibility,
        position=count.scalar_one(),
    )
    db.add(board)
    await db.flush()
    db.add(
        BoardMember(
            board_id=board.id,
            user_id=user.id,
            role=BoardRole.ADMIN,
        )
    )
    for i, (name, _status) in enumerate(DEFAULT_BOARD_LISTS):
        db.add(BoardList(board_id=board.id, name=name, position=i))
    return board


@router.get("/boards/{board_id}", response_model=BoardRead)
async def get_board_endpoint(
    board_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Board:
    return await require_board_view(db, board_id, user)


@router.get("/boards/{board_id}/detail", response_model=BoardDetailRead)
async def get_board_detail(
    board_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BoardDetailRead:
    board = await require_board_view(db, board_id, user)
    lists_result = await db.execute(
        select(BoardList).where(BoardList.board_id == board_id).order_by(BoardList.position)
    )
    lists = list(lists_result.scalars().all())
    list_ids = [lst.id for lst in lists]
    cards: list[Card] = []
    if list_ids:
        cards_result = await db.execute(
            select(Card).where(Card.list_id.in_(list_ids)).order_by(Card.position)
        )
        cards = list(cards_result.scalars().all())
    dep_map = await load_dependency_ids_map(db, [card.id for card in cards])
    return BoardDetailRead(
        board=BoardRead.model_validate(board),
        lists=[ListRead.model_validate(lst) for lst in lists],
        cards=[build_card_read(card, dep_map.get(card.id, [])) for card in cards],
    )


@router.patch("/boards/{board_id}", response_model=BoardRead)
async def update_board(
    board_id: uuid.UUID,
    payload: BoardUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Board:
    board = await require_board_admin(db, board_id, user)
    if payload.name is not None:
        board.name = payload.name
    if payload.visibility is not None:
        board.visibility = payload.visibility
    if payload.position is not None:
        board.position = payload.position
    return board


@router.delete("/boards/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_board(
    board_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    board = await require_board_admin(db, board_id, user)
    await db.delete(board)


@router.get("/boards/{board_id}/members", response_model=list[BoardMemberRead])
async def list_board_members(
    board_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[BoardMember]:
    await require_board_view(db, board_id, user)
    result = await db.execute(
        select(BoardMember)
        .options(selectinload(BoardMember.user))
        .where(BoardMember.board_id == board_id)
    )
    return list(result.scalars().all())


@router.patch("/boards/{board_id}/members/{member_id}", response_model=BoardMemberRead)
async def update_board_member(
    board_id: uuid.UUID,
    member_id: uuid.UUID,
    payload: BoardMemberUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BoardMember:
    await require_board_admin(db, board_id, user)
    result = await db.execute(
        select(BoardMember)
        .options(selectinload(BoardMember.user))
        .where(BoardMember.id == member_id, BoardMember.board_id == board_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    member.role = payload.role
    return member
