import type { TaskIssueType, TaskPriority, TaskStatus } from "../entities/taskFields";
import type { Card } from "../types";

export type DateFilterField = "due_date" | "created_at" | "";

export interface BoardFilterState {
  issueTypes: TaskIssueType[];
  statuses: TaskStatus[];
  priorities: (TaskPriority | "none")[];
  labels: string[];
  assigneeIds: (string | "unassigned")[];
  dateField: DateFilterField;
  dateFrom: string;
  dateTo: string;
}

export const emptyBoardFilters = (): BoardFilterState => ({
  issueTypes: [],
  statuses: [],
  priorities: [],
  labels: [],
  assigneeIds: [],
  dateField: "",
  dateFrom: "",
  dateTo: "",
});

function parseIsoDate(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function cardDateValue(card: Card, field: Exclude<DateFilterField, "">): Date | null {
  if (field === "due_date") {
    return card.due_date ? parseIsoDate(card.due_date) : null;
  }
  const created = new Date(card.created_at);
  return new Date(created.getFullYear(), created.getMonth(), created.getDate());
}

function matchesDateRange(card: Card, filters: BoardFilterState): boolean {
  if (!filters.dateField || (!filters.dateFrom && !filters.dateTo)) return true;

  const cardDate = cardDateValue(card, filters.dateField);
  if (filters.dateField === "due_date" && !cardDate) return false;

  const from = parseIsoDate(filters.dateFrom);
  const to = parseIsoDate(filters.dateTo);

  if (from && cardDate && cardDate < from) return false;
  if (to && cardDate && cardDate > to) return false;
  if ((from || to) && filters.dateField === "created_at" && !cardDate) return false;

  return true;
}

export function filterCards(cards: Card[], filters: BoardFilterState): Card[] {
  return cards.filter((card) => {
    if (filters.issueTypes.length > 0 && !filters.issueTypes.includes(card.issue_type)) {
      return false;
    }

    if (filters.statuses.length > 0 && !filters.statuses.includes(card.status)) {
      return false;
    }

    if (filters.priorities.length > 0) {
      const cardPriority = card.priority ?? "none";
      if (!filters.priorities.includes(cardPriority)) return false;
    }

    if (filters.labels.length > 0) {
      const cardLabels = card.labels ?? [];
      if (!filters.labels.some((label) => cardLabels.includes(label))) return false;
    }

    if (filters.assigneeIds.length > 0) {
      const cardAssignee = card.assignee_id ?? "unassigned";
      if (!filters.assigneeIds.includes(cardAssignee)) return false;
    }

    if (!matchesDateRange(card, filters)) return false;

    return true;
  });
}

export function hasActiveFilters(filters: BoardFilterState): boolean {
  return activeFilterCount(filters) > 0;
}

export function activeFilterCount(filters: BoardFilterState): number {
  let count = 0;
  if (filters.issueTypes.length > 0) count += 1;
  if (filters.statuses.length > 0) count += 1;
  if (filters.priorities.length > 0) count += 1;
  if (filters.labels.length > 0) count += 1;
  if (filters.assigneeIds.length > 0) count += 1;
  if (filters.dateField && (filters.dateFrom || filters.dateTo)) count += 1;
  return count;
}

export function collectBoardLabels(cards: Card[]): string[] {
  const labels = new Set<string>();
  for (const card of cards) {
    for (const label of card.labels ?? []) {
      labels.add(label);
    }
  }
  return [...labels].sort((a, b) => a.localeCompare(b));
}
