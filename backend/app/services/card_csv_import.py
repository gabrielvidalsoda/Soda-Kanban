import csv
import io
import uuid
from dataclasses import dataclass, field
from datetime import date

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import Board, BoardList, Card, TaskIssueType, TaskPriority, TaskStatus, WorkspaceMember
from app.services.board_events import publish_board_event
from app.services.card_dependencies import sync_card_dependencies
from app.services.cards import generate_task_code

REQUIRED_HEADERS = {"title", "list"}
OPTIONAL_HEADERS = {
    "description",
    "issue_type",
    "status",
    "assignee",
    "labels",
    "due_date",
    "priority",
    "acceptance_criteria",
    "dependencies",
    "task_code",
}
ALL_HEADERS = REQUIRED_HEADERS | OPTIONAL_HEADERS
LIST_SEPARATOR = ";"


@dataclass
class CardImportRowError:
    row: int
    message: str


@dataclass
class CardImportResult:
    created: int = 0
    errors: list[CardImportRowError] = field(default_factory=list)


@dataclass
class _ParsedRow:
    row_num: int
    title: str
    description: str | None
    issue_type: TaskIssueType
    status: TaskStatus
    list_id: uuid.UUID
    assignee_id: uuid.UUID | None
    labels: list[str]
    due_date: date | None
    priority: TaskPriority | None
    acceptance_criteria: list[dict[str, object]]
    dependencies_raw: str
    task_code: str | None


def _normalize_header(name: str) -> str:
    return name.strip().lstrip("\ufeff").lower()


def _split_list(value: str) -> list[str]:
    if not value or not value.strip():
        return []
    return [part.strip() for part in value.split(LIST_SEPARATOR) if part.strip()]


def _parse_enum(value: str, enum_cls: type, field_name: str) -> object:
    normalized = value.strip().lower()
    try:
        return enum_cls(normalized)
    except ValueError as exc:
        valid = ", ".join(item.value for item in enum_cls)
        raise ValueError(f"Invalid {field_name}: '{value}'. Expected one of: {valid}") from exc


def _parse_due_date(value: str) -> date | None:
    if not value or not value.strip():
        return None
    try:
        parsed = date.fromisoformat(value.strip())
    except ValueError as exc:
        raise ValueError(f"Invalid due_date: '{value}'. Expected YYYY-MM-DD") from exc
    if parsed < date.today():
        raise ValueError("Due date cannot be in the past")
    return parsed


async def _assign_unique_task_code(db: AsyncSession, card: Card, preferred: str | None) -> None:
    if preferred:
        exists = await db.execute(select(Card.id).where(Card.task_code == preferred))
        if exists.scalar_one_or_none() is not None:
            raise ValueError(f"Task code '{preferred}' already exists")
        card.task_code = preferred
        await db.flush()
        return

    for _ in range(5):
        code = generate_task_code()
        exists = await db.execute(select(Card.id).where(Card.task_code == code))
        if exists.scalar_one_or_none() is None:
            card.task_code = code
            await db.flush()
            return
    raise ValueError("Could not assign task code")


async def import_cards_from_csv(
    db: AsyncSession,
    board_id: uuid.UUID,
    actor_id: uuid.UUID,
    file_content: bytes,
) -> CardImportResult:
    result = CardImportResult()

    try:
        text = file_content.decode("utf-8-sig")
    except UnicodeDecodeError:
        result.errors.append(CardImportRowError(row=0, message="File must be UTF-8 encoded"))
        return result

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        result.errors.append(CardImportRowError(row=0, message="CSV file is empty or has no header row"))
        return result

    headers = {_normalize_header(name) for name in reader.fieldnames if name}
    missing = REQUIRED_HEADERS - headers
    if missing:
        result.errors.append(
            CardImportRowError(row=1, message=f"Missing required columns: {', '.join(sorted(missing))}")
        )
        return result

    unknown = headers - ALL_HEADERS
    if unknown:
        result.errors.append(
            CardImportRowError(row=1, message=f"Unknown columns: {', '.join(sorted(unknown))}")
        )
        return result

    lists_result = await db.execute(
        select(BoardList).where(BoardList.board_id == board_id).order_by(BoardList.position)
    )
    board_lists = list(lists_result.scalars().all())
    list_by_name = {lst.name.lower(): lst for lst in board_lists}

    board = await db.get(Board, board_id)
    if board is None:
        result.errors.append(CardImportRowError(row=0, message="Board not found"))
        return result

    members_result = await db.execute(
        select(WorkspaceMember)
        .options(selectinload(WorkspaceMember.user))
        .where(WorkspaceMember.workspace_id == board.workspace_id)
    )
    members = list(members_result.scalars().all())
    assignee_by_email = {m.user.email.lower(): m.user_id for m in members}
    assignee_by_name = {m.user.name.lower(): m.user_id for m in members}

    existing_codes_result = await db.execute(
        select(Card.task_code)
        .join(BoardList, Card.list_id == BoardList.id)
        .where(BoardList.board_id == board_id, Card.task_code.isnot(None))
    )
    used_task_codes = {code for code in existing_codes_result.scalars().all() if code}

    list_positions: dict[uuid.UUID, int] = {}
    for lst in board_lists:
        max_pos_result = await db.execute(
            select(func.coalesce(func.max(Card.position), -1)).where(Card.list_id == lst.id)
        )
        list_positions[lst.id] = max_pos_result.scalar_one() + 1

    parsed_rows: list[_ParsedRow] = []

    for row_num, raw_row in enumerate(reader, start=2):
        row = {_normalize_header(k): (v or "").strip() for k, v in raw_row.items() if k}

        title = row.get("title", "").strip()
        list_name = row.get("list", "").strip()
        if not title and not list_name and not any(row.get(h, "") for h in OPTIONAL_HEADERS):
            continue

        try:
            if not title:
                raise ValueError("title is required")
            if not list_name:
                raise ValueError("list is required")

            board_list = list_by_name.get(list_name.lower())
            if board_list is None:
                valid = ", ".join(lst.name for lst in board_lists)
                raise ValueError(f"Unknown list '{list_name}'. Expected one of: {valid}")

            assignee_raw = row.get("assignee", "").strip()
            assignee_id: uuid.UUID | None = None
            if assignee_raw:
                assignee_id = assignee_by_email.get(assignee_raw.lower()) or assignee_by_name.get(
                    assignee_raw.lower()
                )
                if assignee_id is None:
                    raise ValueError(f"Unknown assignee '{assignee_raw}'")

            issue_type_raw = row.get("issue_type", "").strip()
            issue_type = (
                _parse_enum(issue_type_raw, TaskIssueType, "issue_type")
                if issue_type_raw
                else TaskIssueType.TASK
            )

            status_raw = row.get("status", "").strip()
            status = (
                _parse_enum(status_raw, TaskStatus, "status") if status_raw else TaskStatus.BACKLOG
            )

            priority_raw = row.get("priority", "").strip()
            priority = _parse_enum(priority_raw, TaskPriority, "priority") if priority_raw else None

            description_raw = row.get("description", "").strip()
            description = description_raw or None

            labels = _split_list(row.get("labels", ""))
            acceptance_criteria = [{"text": text, "done": False} for text in _split_list(row.get("acceptance_criteria", ""))]
            due_date = _parse_due_date(row.get("due_date", ""))

            task_code_raw = row.get("task_code", "").strip()
            if task_code_raw:
                code_upper = task_code_raw.upper()
                if code_upper in used_task_codes:
                    raise ValueError(f"Task code '{task_code_raw}' already exists")
                used_task_codes.add(code_upper)

            parsed_rows.append(
                _ParsedRow(
                    row_num=row_num,
                    title=title,
                    description=description,
                    issue_type=issue_type,
                    status=status,
                    list_id=board_list.id,
                    assignee_id=assignee_id,
                    labels=labels,
                    due_date=due_date,
                    priority=priority,
                    acceptance_criteria=acceptance_criteria,
                    dependencies_raw=row.get("dependencies", "").strip(),
                    task_code=task_code_raw.upper() if task_code_raw else None,
                )
            )
        except ValueError as exc:
            result.errors.append(CardImportRowError(row=row_num, message=str(exc)))

    created_cards: list[tuple[int, Card, str]] = []

    for parsed in parsed_rows:
        try:
            position = list_positions[parsed.list_id]
            list_positions[parsed.list_id] += 1

            card = Card(
                list_id=parsed.list_id,
                title=parsed.title,
                description=parsed.description,
                assignee_id=parsed.assignee_id,
                due_date=parsed.due_date,
                position=position,
                issue_type=parsed.issue_type,
                status=parsed.status,
                priority=parsed.priority,
                labels=parsed.labels,
                acceptance_criteria=parsed.acceptance_criteria,
            )
            db.add(card)
            await db.flush()
            await _assign_unique_task_code(db, card, parsed.task_code)
            created_cards.append((parsed.row_num, card, parsed.dependencies_raw))
            result.created += 1
        except ValueError as exc:
            result.errors.append(CardImportRowError(row=parsed.row_num, message=str(exc)))

    existing_cards_result = await db.execute(
        select(Card.id, Card.task_code)
        .join(BoardList, Card.list_id == BoardList.id)
        .where(BoardList.board_id == board_id, Card.task_code.isnot(None))
    )
    task_code_to_id = {code: card_id for card_id, code in existing_cards_result.all() if code}
    for _row_num, card, _deps in created_cards:
        if card.task_code:
            task_code_to_id[card.task_code] = card.id

    for row_num, card, dependencies_raw in created_cards:
        dep_codes = _split_list(dependencies_raw)
        if not dep_codes:
            continue
        try:
            dep_ids: list[uuid.UUID] = []
            for code in dep_codes:
                dep_id = task_code_to_id.get(code.upper())
                if dep_id is None:
                    raise ValueError(f"Unknown dependency task_code '{code}'")
                dep_ids.append(dep_id)
            await sync_card_dependencies(db, card.id, dep_ids)
        except ValueError as exc:
            result.errors.append(CardImportRowError(row=row_num, message=str(exc)))
        except HTTPException as exc:
            detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
            result.errors.append(CardImportRowError(row=row_num, message=detail))

    for _row_num, card, _deps in created_cards:
        await publish_board_event(
            str(board_id),
            {
                "type": "card.created",
                "card_id": str(card.id),
                "list_id": str(card.list_id),
                "actor_id": str(actor_id),
            },
        )

    await db.commit()
    return result
