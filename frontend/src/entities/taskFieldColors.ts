import type { TaskIssueType, TaskPriority } from "./taskFields";

export const ISSUE_TYPE_COLORS: Record<TaskIssueType, string> = {
  bug: "#D32F2F",
  task: "#56B4E9",
  story: "#009E73",
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "#E67E22",
  medium: "#F1C21B",
  high: "#FF8533",
};

export function coloredBadgeStyle(color: string): { backgroundColor: string; color: string } {
  return { backgroundColor: color, color: "#fff" };
}

export function priorityDotStyle(color: string): { backgroundColor: string } {
  return { backgroundColor: color };
}
