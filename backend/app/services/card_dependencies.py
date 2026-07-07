import uuid

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import BoardList, Card, CardDependency


async def get_board_id_for_card(db: AsyncSession, card_id: uuid.UUID) -> uuid.UUID | None:
    result = await db.execute(
        select(BoardList.board_id)
        .join(Card, Card.list_id == BoardList.id)
        .where(Card.id == card_id)
    )
    return result.scalar_one_or_none()


async def validate_dependency_ids(
    db: AsyncSession, card_id: uuid.UUID, dependency_ids: list[uuid.UUID]
) -> None:
    if card_id in dependency_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A card cannot depend on itself",
        )

    board_id = await get_board_id_for_card(db, card_id)
    if board_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")

    if not dependency_ids:
        return

    result = await db.execute(
        select(Card.id)
        .join(BoardList, Card.list_id == BoardList.id)
        .where(Card.id.in_(dependency_ids), BoardList.board_id == board_id)
    )
    found = set(result.scalars().all())
    missing = set(dependency_ids) - found
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dependencies must be other cards on the same board",
        )


async def sync_card_dependencies(
    db: AsyncSession, card_id: uuid.UUID, dependency_ids: list[uuid.UUID]
) -> None:
    await validate_dependency_ids(db, card_id, dependency_ids)
    await db.execute(delete(CardDependency).where(CardDependency.card_id == card_id))
    for depends_on_id in dependency_ids:
        db.add(CardDependency(card_id=card_id, depends_on_card_id=depends_on_id))
    await db.flush()


async def load_dependency_ids_map(
    db: AsyncSession, card_ids: list[uuid.UUID]
) -> dict[uuid.UUID, list[uuid.UUID]]:
    if not card_ids:
        return {}
    result = await db.execute(
        select(CardDependency).where(CardDependency.card_id.in_(card_ids))
    )
    mapping: dict[uuid.UUID, list[uuid.UUID]] = {card_id: [] for card_id in card_ids}
    for dep in result.scalars().all():
        mapping[dep.card_id].append(dep.depends_on_card_id)
    return mapping


async def load_card_with_dependencies(db: AsyncSession, card_id: uuid.UUID) -> Card | None:
    result = await db.execute(
        select(Card)
        .options(selectinload(Card.depends_on_links))
        .where(Card.id == card_id)
    )
    return result.scalar_one_or_none()
