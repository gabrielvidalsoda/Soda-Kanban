export type TaskIssueType = "task" | "bug" | "story";
export type TaskStatus = "backlog" | "blocked" | "in_progress" | "in_review" | "qa" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface AcceptanceCriterionItem {
  text: string;
  done: boolean;
}

export interface TaskFieldMeta {
  fieldKey: string;
  label: string;
  dataType: string;
  required?: boolean;
}

export const TASK_ISSUE_TYPE_OPTIONS: { value: TaskIssueType; label: string }[] = [
  { value: "task", label: "Task" },
  { value: "bug", label: "Bug" },
  { value: "story", label: "Story" },
];

export const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "backlog", label: "Backlog" },
  { value: "blocked", label: "Blocked" },
  { value: "in_progress", label: "In progress" },
  { value: "in_review", label: "In review" },
  { value: "qa", label: "QA" },
  { value: "done", label: "Done" },
];

export const TASK_PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export const TASK_UI_FIELDS: TaskFieldMeta[] = [
  { fieldKey: "summary", label: "Summary", dataType: "string", required: true },
  { fieldKey: "description", label: "Description", dataType: "rich_text" },
  { fieldKey: "issue_type", label: "Issue Type", dataType: "enum" },
  { fieldKey: "status", label: "Status", dataType: "enum" },
  { fieldKey: "assignee", label: "Assignee", dataType: "person" },
  { fieldKey: "labels", label: "Labels", dataType: "list" },
  { fieldKey: "due_date", label: "Due Date", dataType: "date" },
  { fieldKey: "priority", label: "Priority", dataType: "enum" },
  { fieldKey: "acceptance_criteria", label: "Acceptance criteria", dataType: "checklist" },
  { fieldKey: "dependencies", label: "Dependencies", dataType: "relation" },
];
