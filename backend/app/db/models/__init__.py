import enum
import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def _pg_enum(enum_cls: type[enum.Enum], name: str) -> Enum:
    return Enum(
        enum_cls,
        name=name,
        values_callable=lambda members: [member.value for member in members],
    )


class BoardVisibility(str, enum.Enum):
    PRIVATE = "private"
    TEAM = "team"
    PUBLIC = "public"


class TaskIssueType(str, enum.Enum):
    TASK = "task"
    BUG = "bug"
    STORY = "story"


class TaskStatus(str, enum.Enum):
    BACKLOG = "backlog"
    BLOCKED = "blocked"
    IN_PROGRESS = "in_progress"
    IN_REVIEW = "in_review"
    QA = "qa"
    DONE = "done"


class TaskPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class WorkspaceRole(str, enum.Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"


class BoardRole(str, enum.Enum):
    ADMIN = "admin"
    PROJECT_MANAGER = "project_manager"
    COLLABORATOR = "collaborator"


class NotificationEventType(str, enum.Enum):
    CARD_ASSIGNED = "card_assigned"
    DUE_DATE_REMINDER = "due_date_reminder"
    COMMENT_ADDED = "comment_added"
    BOARD_INVITE = "board_invite"
    CARD_MOVED = "card_moved"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("workspaces.id", ondelete="RESTRICT"), index=True, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    workspace: Mapped["Workspace"] = relationship(foreign_keys=[workspace_id])
    workspace_memberships: Mapped[list["WorkspaceMember"]] = relationship(back_populates="user")
    board_memberships: Mapped[list["BoardMember"]] = relationship(back_populates="user")
    comments: Mapped[list["Comment"]] = relationship(back_populates="author")
    notification_preferences: Mapped[list["NotificationPreference"]] = relationship(
        back_populates="user"
    )


class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    members: Mapped[list["WorkspaceMember"]] = relationship(back_populates="workspace")
    boards: Mapped[list["Board"]] = relationship(back_populates="workspace")
    invitations: Mapped[list["Invitation"]] = relationship(back_populates="workspace")


class WorkspaceMember(Base):
    __tablename__ = "workspace_members"
    __table_args__ = (UniqueConstraint("workspace_id", "user_id", name="uq_workspace_user"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role: Mapped[WorkspaceRole] = mapped_column(
        _pg_enum(WorkspaceRole, "workspace_role"), default=WorkspaceRole.MEMBER
    )
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    workspace: Mapped["Workspace"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship(back_populates="workspace_memberships")


class Board(Base):
    __tablename__ = "boards"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    visibility: Mapped[BoardVisibility] = mapped_column(
        _pg_enum(BoardVisibility, "board_visibility"), default=BoardVisibility.TEAM
    )
    position: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    workspace: Mapped["Workspace"] = relationship(back_populates="boards")
    members: Mapped[list["BoardMember"]] = relationship(back_populates="board")
    lists: Mapped[list["BoardList"]] = relationship(back_populates="board", order_by="BoardList.position")


class BoardMember(Base):
    __tablename__ = "board_members"
    __table_args__ = (UniqueConstraint("board_id", "user_id", name="uq_board_user"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    board_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("boards.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role: Mapped[BoardRole] = mapped_column(
        _pg_enum(BoardRole, "board_role"), default=BoardRole.COLLABORATOR
    )
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    board: Mapped["Board"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship(back_populates="board_memberships")


class BoardList(Base):
    __tablename__ = "lists"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    board_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("boards.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0)

    board: Mapped["Board"] = relationship(back_populates="lists")
    cards: Mapped[list["Card"]] = relationship(back_populates="board_list", order_by="Card.position")


class Card(Base):
    __tablename__ = "cards"
    __table_args__ = (UniqueConstraint("list_id", "position", name="uq_list_position"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    list_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("lists.id", ondelete="CASCADE"), index=True)
    task_code: Mapped[str | None] = mapped_column(String(50), unique=True, index=True, nullable=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    issue_type: Mapped[TaskIssueType] = mapped_column(
        _pg_enum(TaskIssueType, "task_issue_type"), default=TaskIssueType.TASK
    )
    status: Mapped[TaskStatus] = mapped_column(
        _pg_enum(TaskStatus, "task_status"), default=TaskStatus.BACKLOG
    )
    priority: Mapped[TaskPriority | None] = mapped_column(
        _pg_enum(TaskPriority, "task_priority"), nullable=True
    )
    labels: Mapped[list] = mapped_column(JSONB, default=list, server_default="[]")
    acceptance_criteria: Mapped[list] = mapped_column(JSONB, default=list, server_default="[]")
    assignee_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    board_list: Mapped["BoardList"] = relationship(back_populates="cards")
    assignee: Mapped["User | None"] = relationship(foreign_keys=[assignee_id])
    comments: Mapped[list["Comment"]] = relationship(back_populates="card", order_by="Comment.created_at")
    attachments: Mapped[list["Attachment"]] = relationship(back_populates="card")
    depends_on_links: Mapped[list["CardDependency"]] = relationship(
        back_populates="card",
        foreign_keys="CardDependency.card_id",
        cascade="all, delete-orphan",
    )


class CardDependency(Base):
    __tablename__ = "card_dependencies"
    __table_args__ = (
        UniqueConstraint("card_id", "depends_on_card_id", name="uq_card_dependency"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    card_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("cards.id", ondelete="CASCADE"), index=True
    )
    depends_on_card_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("cards.id", ondelete="CASCADE"), index=True
    )

    card: Mapped["Card"] = relationship(
        back_populates="depends_on_links",
        foreign_keys=[card_id],
    )
    depends_on: Mapped["Card"] = relationship(foreign_keys=[depends_on_card_id])


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    card_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cards.id", ondelete="CASCADE"), index=True)
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    card: Mapped["Card"] = relationship(back_populates="comments")
    author: Mapped["User"] = relationship(back_populates="comments")


class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    card_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cards.id", ondelete="CASCADE"), index=True)
    uploaded_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    content_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    card: Mapped["Card"] = relationship(back_populates="attachments")
    uploaded_by: Mapped["User"] = relationship()


class Invitation(Base):
    __tablename__ = "invitations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    invited_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    board_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("boards.id", ondelete="CASCADE"), nullable=True
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    workspace: Mapped["Workspace"] = relationship(back_populates="invitations")
    invited_by: Mapped["User"] = relationship()


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"
    __table_args__ = (
        UniqueConstraint("user_id", "event_type", name="uq_user_notification_event"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    event_type: Mapped[NotificationEventType] = mapped_column(
        _pg_enum(NotificationEventType, "notification_event_type"), nullable=False
    )
    email_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    user: Mapped["User"] = relationship(back_populates="notification_preferences")
