export type TaskIssueType = "task" | "bug" | "story";
export type TaskStatus = "backlog" | "blocked" | "in_progress" | "in_review" | "qa" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface AcceptanceCriterionItem {
  text: string;
  done: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatar_url: string | null;
  workspace_id: string | null;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface WorkspaceMember {
  id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  user: User;
}

export interface Invitation {
  id: string;
  token: string;
  workspace_id: string;
  email: string | null;
  board_id: string | null;
  expires_at: string;
  invite_url: string;
}

export interface Board {
  id: string;
  workspace_id: string;
  name: string;
  visibility: "private" | "team" | "public";
  position: number;
  created_at: string;
}

export interface BoardList {
  id: string;
  board_id: string;
  name: string;
  position: number;
}

export interface Card {
  id: string;
  list_id: string;
  task_code: string | null;
  title: string;
  description: string | null;
  issue_type: "task" | "bug" | "story";
  status: "backlog" | "blocked" | "in_progress" | "in_review" | "qa" | "done";
  priority: "low" | "medium" | "high" | null;
  labels: string[];
  acceptance_criteria: { text: string; done: boolean }[];
  assignee_id: string | null;
  due_date: string | null;
  position: number;
  dependency_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  card_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author: User;
}

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export interface Attachment {
  id: string;
  card_id: string;
  filename: string;
  content_type: string | null;
  size_bytes: number | null;
  created_at: string;
  download_url: string | null;
}

export interface PresignedUploadResponse {
  upload_url: string;
  attachment_id: string;
  s3_key: string;
}

export interface CardImportRowError {
  row: number;
  message: string;
}

export interface CardImportResult {
  created: number;
  errors: CardImportRowError[];
}

export interface BoardDetail {
  board: Board;
  lists: BoardList[];
  cards: Card[];
}

export interface NotificationPreference {
  event_type: string;
  email_enabled: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface BoardEvent {
  type: string;
  card_id?: string;
  list_id?: string;
  position?: number;
  actor_id?: string;
}
