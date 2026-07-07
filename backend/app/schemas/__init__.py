import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.db.models import BoardRole, BoardVisibility, NotificationEventType, TaskIssueType, TaskPriority, TaskStatus, WorkspaceRole


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    name: str
    phone: str | None = None
    avatar_url: str | None = None
    workspace_id: uuid.UUID | None = None
    created_at: datetime


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = Field(default=None, max_length=50)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("Name is required")
        return v.strip() if v is not None else v


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=1, max_length=255)
    invite_token: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class PasswordResetRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserRead


class RefreshRequest(BaseModel):
    refresh_token: str


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class WorkspaceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    owner_id: uuid.UUID
    created_at: datetime


class WorkspaceMemberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    role: WorkspaceRole
    user: UserRead


class WorkspaceMemberUpdate(BaseModel):
    role: WorkspaceRole


class BoardCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    visibility: BoardVisibility = BoardVisibility.TEAM


class BoardUpdate(BaseModel):
    name: str | None = None
    visibility: BoardVisibility | None = None
    position: int | None = None


class BoardRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    visibility: BoardVisibility
    position: int
    created_at: datetime


class BoardMemberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    role: BoardRole
    user: UserRead


class BoardMemberUpdate(BaseModel):
    role: BoardRole


class ListCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    position: int | None = None


class ListUpdate(BaseModel):
    name: str | None = None
    position: int | None = None


class ListRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    board_id: uuid.UUID
    name: str
    position: int


class AcceptanceCriterionItem(BaseModel):
    text: str
    done: bool = False


class CardCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: str | None = None
    assignee_id: uuid.UUID | None = None
    due_date: date | None = None
    position: int | None = None
    issue_type: TaskIssueType = TaskIssueType.TASK
    status: TaskStatus = TaskStatus.BACKLOG
    priority: TaskPriority | None = None
    labels: list[str] = Field(default_factory=list)
    acceptance_criteria: list[AcceptanceCriterionItem] = Field(default_factory=list)
    dependency_ids: list[uuid.UUID] = Field(default_factory=list)

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Title is required")
        return v.strip()

    @field_validator("description")
    @classmethod
    def description_optional(cls, v: str | None) -> str | None:
        if v is None:
            return None
        stripped = v.strip()
        return stripped or None

    @field_validator("due_date")
    @classmethod
    def due_date_not_past(cls, v: date | None) -> date | None:
        if v is not None and v < date.today():
            raise ValueError("Due date cannot be in the past")
        return v


class CardUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    assignee_id: uuid.UUID | None = None
    due_date: date | None = None
    list_id: uuid.UUID | None = None
    position: int | None = None
    issue_type: TaskIssueType | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    labels: list[str] | None = None
    acceptance_criteria: list[AcceptanceCriterionItem] | None = None
    dependency_ids: list[uuid.UUID] | None = None

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("Title is required")
        return v.strip() if v is not None else v

    @field_validator("description")
    @classmethod
    def description_optional(cls, v: str | None) -> str | None:
        if v is None:
            return None
        stripped = v.strip()
        return stripped or None

    @field_validator("due_date")
    @classmethod
    def due_date_not_past(cls, v: date | None) -> date | None:
        if v is not None and v < date.today():
            raise ValueError("Due date cannot be in the past")
        return v


class CardMove(BaseModel):
    list_id: uuid.UUID
    position: int


class CardRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    list_id: uuid.UUID
    task_code: str | None
    title: str
    description: str | None
    issue_type: TaskIssueType
    status: TaskStatus
    priority: TaskPriority | None
    labels: list[str]
    acceptance_criteria: list[AcceptanceCriterionItem]
    assignee_id: uuid.UUID | None
    due_date: date | None
    position: int
    dependency_ids: list[uuid.UUID] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class CommentCreate(BaseModel):
    content: str = Field(min_length=1)


class CommentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    card_id: uuid.UUID
    author_id: uuid.UUID
    content: str
    created_at: datetime
    author: UserRead


class AttachmentCreate(BaseModel):
    filename: str
    content_type: str | None = None
    size_bytes: int


class AttachmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    card_id: uuid.UUID
    filename: str
    content_type: str | None
    size_bytes: int | None
    created_at: datetime
    download_url: str | None = None


class PresignedUploadResponse(BaseModel):
    upload_url: str
    attachment_id: uuid.UUID
    s3_key: str


class InvitationCreate(BaseModel):
    email: EmailStr | None = None
    board_id: uuid.UUID | None = None


class InvitationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    token: str
    workspace_id: uuid.UUID
    email: str | None
    board_id: uuid.UUID | None
    expires_at: datetime
    invite_url: str


class NotificationPreferenceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    event_type: NotificationEventType
    email_enabled: bool


class NotificationPreferenceUpdate(BaseModel):
    preferences: list[NotificationPreferenceRead]


class BoardDetailRead(BaseModel):
    board: BoardRead
    lists: list[ListRead]
    cards: list[CardRead]


class CardImportRowError(BaseModel):
    row: int
    message: str


class CardImportResult(BaseModel):
    created: int
    errors: list[CardImportRowError]
