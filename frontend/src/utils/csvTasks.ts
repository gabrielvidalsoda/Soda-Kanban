import type { BoardDetail, Card, WorkspaceMember } from "../types";

export const TASK_CSV_HEADERS = [
  "title",
  "description",
  "issue_type",
  "status",
  "list",
  "assignee",
  "labels",
  "due_date",
  "priority",
  "acceptance_criteria",
  "dependencies",
  "task_code",
] as const;

const LIST_SEPARATOR = ";";

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function joinList(values: string[]): string {
  return values.filter(Boolean).join(LIST_SEPARATOR);
}

function rowToCsv(values: string[]): string {
  return values.map(escapeCsvField).join(",");
}

export const TASK_CSV_EXAMPLE = [
  rowToCsv([...TASK_CSV_HEADERS]),
  rowToCsv([
    "Set up auth flow",
    "Implement login and refresh tokens",
    "task",
    "backlog",
    "Backlog",
    "jane@example.com",
    "backend",
    "2026-07-15",
    "high",
    "User can log in;Token refresh works",
    "",
    "AUTH-01",
  ]),
].join("\n");

export function buildTasksCsv(data: BoardDetail, members: WorkspaceMember[]): string {
  const listById = Object.fromEntries(data.lists.map((l) => [l.id, l.name]));
  const cardById = Object.fromEntries(data.cards.map((c) => [c.id, c]));
  const memberByUserId = Object.fromEntries(members.map((m) => [m.user_id, m.user]));

  const rows = data.cards.map((card) => cardToRow(card, listById, cardById, memberByUserId));
  return [rowToCsv([...TASK_CSV_HEADERS]), ...rows.map(rowToCsv)].join("\n");
}

function cardToRow(
  card: Card,
  listById: Record<string, string>,
  cardById: Record<string, Card>,
  memberByUserId: Record<string, { email: string; name: string }>
): string[] {
  const assignee = card.assignee_id ? memberByUserId[card.assignee_id] : null;
  const dependencies = card.dependency_ids
    .map((id) => cardById[id]?.task_code ?? "")
    .filter(Boolean);

  return [
    card.title,
    card.description ?? "",
    card.issue_type,
    card.status,
    listById[card.list_id] ?? "",
    assignee?.email ?? assignee?.name ?? "",
    joinList(card.labels),
    card.due_date ?? "",
    card.priority ?? "",
    joinList(card.acceptance_criteria.map((item) => item.text)),
    joinList(dependencies),
    card.task_code ?? "",
  ];
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function sanitizeFilename(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "board";
}

export function exportBoardTasksCsv(data: BoardDetail, members: WorkspaceMember[]): void {
  const date = new Date().toISOString().slice(0, 10);
  const filename = `${sanitizeFilename(data.board.name)}-tasks-${date}.csv`;
  downloadCsv(buildTasksCsv(data, members), filename);
}
