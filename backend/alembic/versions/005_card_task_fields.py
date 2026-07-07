"""card task fields and dependencies

Revision ID: 005
Revises: 004
Create Date: 2026-06-19
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    task_issue_type = postgresql.ENUM("task", "bug", "story", name="task_issue_type", create_type=False)
    task_status = postgresql.ENUM(
        "todo", "in_progress", "done", "blocked", name="task_status", create_type=False
    )
    task_priority = postgresql.ENUM("low", "medium", "high", name="task_priority", create_type=False)

    task_issue_type.create(op.get_bind(), checkfirst=True)
    task_status.create(op.get_bind(), checkfirst=True)
    task_priority.create(op.get_bind(), checkfirst=True)

    op.add_column("cards", sa.Column("task_code", sa.String(50), nullable=True))
    op.create_index("ix_cards_task_code", "cards", ["task_code"], unique=True)
    op.add_column(
        "cards",
        sa.Column("issue_type", task_issue_type, nullable=False, server_default="task"),
    )
    op.add_column(
        "cards",
        sa.Column("status", task_status, nullable=False, server_default="todo"),
    )
    op.add_column("cards", sa.Column("priority", task_priority, nullable=True))
    op.add_column(
        "cards",
        sa.Column("labels", postgresql.JSONB(), nullable=False, server_default="[]"),
    )
    op.add_column(
        "cards",
        sa.Column("acceptance_criteria", postgresql.JSONB(), nullable=False, server_default="[]"),
    )

    op.create_table(
        "card_dependencies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("card_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cards.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "depends_on_card_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("cards.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.UniqueConstraint("card_id", "depends_on_card_id", name="uq_card_dependency"),
    )
    op.create_index("ix_card_dependencies_card_id", "card_dependencies", ["card_id"])
    op.create_index("ix_card_dependencies_depends_on_card_id", "card_dependencies", ["depends_on_card_id"])


def downgrade() -> None:
    op.drop_index("ix_card_dependencies_depends_on_card_id", table_name="card_dependencies")
    op.drop_index("ix_card_dependencies_card_id", table_name="card_dependencies")
    op.drop_table("card_dependencies")

    op.drop_column("cards", "acceptance_criteria")
    op.drop_column("cards", "labels")
    op.drop_column("cards", "priority")
    op.drop_column("cards", "status")
    op.drop_column("cards", "issue_type")
    op.drop_index("ix_cards_task_code", table_name="cards")
    op.drop_column("cards", "task_code")

    op.execute("DROP TYPE IF EXISTS task_priority")
    op.execute("DROP TYPE IF EXISTS task_status")
    op.execute("DROP TYPE IF EXISTS task_issue_type")
