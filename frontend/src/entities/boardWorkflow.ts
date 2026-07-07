import type { TaskStatus } from "./taskFields";

export const DEFAULT_BOARD_LISTS: { name: string; status: TaskStatus }[] = [
  { name: "Backlog", status: "backlog" },
  { name: "Blocked", status: "blocked" },
  { name: "In Progress", status: "in_progress" },
  { name: "In Review", status: "in_review" },
  { name: "QA", status: "qa" },
  { name: "Done", status: "done" },
];

const LIST_NAME_TO_STATUS = Object.fromEntries(
  DEFAULT_BOARD_LISTS.map(({ name, status }) => [name, status])
) as Record<string, TaskStatus>;

const STATUS_TO_LIST_NAME = Object.fromEntries(
  DEFAULT_BOARD_LISTS.map(({ name, status }) => [status, name])
) as Record<TaskStatus, string>;

export function statusForListName(name: string): TaskStatus | null {
  return LIST_NAME_TO_STATUS[name] ?? null;
}

export function listNameForStatus(status: TaskStatus): string | null {
  return STATUS_TO_LIST_NAME[status] ?? null;
}

export function statusForListId(
  listId: string | undefined,
  lists: { id: string; name: string }[] | undefined
): TaskStatus {
  if (!listId || !lists) return "backlog";
  const list = lists.find((item) => item.id === listId);
  return list ? statusForListName(list.name) ?? "backlog" : "backlog";
}
