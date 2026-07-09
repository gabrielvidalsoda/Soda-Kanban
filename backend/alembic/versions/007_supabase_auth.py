"""supabase auth cleanup

Revision ID: 007
Revises: 006
Create Date: 2026-07-09
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table("refresh_tokens")
    op.drop_column("users", "password_hash")
    op.alter_column("attachments", "s3_key", new_column_name="storage_path")


def downgrade() -> None:
    op.alter_column("attachments", "storage_path", new_column_name="s3_key")
    op.add_column("users", sa.Column("password_hash", sa.String(255), nullable=False, server_default=""))
    op.alter_column("users", "password_hash", server_default=None)
    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("token_hash", sa.String(255), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
