"""workflow columns and status sync

Revision ID: 006
Revises: 005
Create Date: 2026-07-07
"""

import uuid
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

WORKFLOW_COLUMNS: list[tuple[str, int]] = [
    ("Backlog", 0),
    ("Blocked", 1),
    ("In Progress", 2),
    ("In Review", 3),
    ("QA", 4),
    ("Done", 5),
]


def upgrade() -> None:
    op.execute("ALTER TYPE task_status RENAME VALUE 'todo' TO 'backlog'")
    op.execute("ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'in_review'")
    op.execute("ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'qa'")
    op.execute("ALTER TABLE cards ALTER COLUMN status SET DEFAULT 'backlog'")

    op.execute("UPDATE lists SET name = 'Backlog' WHERE name = 'To Do'")

    conn = op.get_bind()
    board_ids = conn.execute(sa.text("SELECT id FROM boards")).fetchall()

    for (board_id,) in board_ids:
        existing = conn.execute(
            sa.text("SELECT id, name FROM lists WHERE board_id = :board_id"),
            {"board_id": board_id},
        ).fetchall()
        lists_by_name = {name: list_id for list_id, name in existing}

        for name, position in WORKFLOW_COLUMNS:
            list_id = lists_by_name.get(name)
            if list_id is not None:
                conn.execute(
                    sa.text("UPDATE lists SET position = :position WHERE id = :list_id"),
                    {"position": position, "list_id": list_id},
                )
            else:
                new_id = uuid.uuid4()
                conn.execute(
                    sa.text(
                        "INSERT INTO lists (id, board_id, name, position) "
                        "VALUES (:id, :board_id, :name, :position)"
                    ),
                    {
                        "id": new_id,
                        "board_id": board_id,
                        "name": name,
                        "position": position,
                    },
                )


def downgrade() -> None:
    conn = op.get_bind()
    board_ids = conn.execute(sa.text("SELECT id FROM boards")).fetchall()

    for (board_id,) in board_ids:
        conn.execute(
            sa.text("DELETE FROM lists WHERE board_id = :board_id AND name IN ('Blocked', 'In Review', 'QA')"),
            {"board_id": board_id},
        )
        conn.execute(
            sa.text(
                "UPDATE lists SET position = 0 WHERE board_id = :board_id AND name = 'Backlog'"
            ),
            {"board_id": board_id},
        )
        conn.execute(
            sa.text(
                "UPDATE lists SET name = 'To Do', position = 0 "
                "WHERE board_id = :board_id AND name = 'Backlog'"
            ),
            {"board_id": board_id},
        )
        conn.execute(
            sa.text(
                "UPDATE lists SET position = 1 WHERE board_id = :board_id AND name = 'In Progress'"
            ),
            {"board_id": board_id},
        )
        conn.execute(
            sa.text("UPDATE lists SET position = 2 WHERE board_id = :board_id AND name = 'Done'"),
            {"board_id": board_id},
        )

    op.execute("ALTER TABLE cards ALTER COLUMN status SET DEFAULT 'todo'")
    op.execute("UPDATE cards SET status = 'todo' WHERE status = 'backlog'")
    op.execute("ALTER TYPE task_status RENAME VALUE 'backlog' TO 'todo'")
    # PostgreSQL does not support removing enum values; in_review and qa remain unused after downgrade.
