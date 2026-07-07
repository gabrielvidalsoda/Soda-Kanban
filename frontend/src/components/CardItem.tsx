import type { Card } from "../types";
import { TASK_ISSUE_TYPE_OPTIONS } from "../entities/taskFields";

interface CardItemProps {
  card: Card;
  assigneeName?: string;
  onClick?: () => void;
  isDragging?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

const ISSUE_TYPE_LABELS = Object.fromEntries(
  TASK_ISSUE_TYPE_OPTIONS.map((opt) => [opt.value, opt.label])
);

const PRIORITY_DOT: Record<string, string> = {
  low: "bg-gray-400",
  medium: "bg-yellow-400",
  high: "bg-red-500",
};

export function CardItem({ card, assigneeName, onClick, isDragging }: CardItemProps) {
  const visibleLabels = (card.labels ?? []).slice(0, 2);
  const extraLabelCount = (card.labels?.length ?? 0) - visibleLabels.length;

  return (
    <div
      onClick={onClick}
      className={`bg-gray-800 rounded-lg p-3 cursor-pointer hover:bg-gray-700/80 border border-gray-700/50 hover:border-gray-600 transition-all ${
        isDragging ? "shadow-xl rotate-1 ring-2 ring-blue-500/50" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        {card.priority && (
          <span
            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[card.priority]}`}
            title={`${card.priority} priority`}
          />
        )}
        <p className="text-sm font-medium text-white leading-snug flex-1">{card.title}</p>
      </div>

      {(card.issue_type !== "task" || visibleLabels.length > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {card.issue_type !== "task" && (
            <span className="rounded bg-gray-700 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-300">
              {ISSUE_TYPE_LABELS[card.issue_type] ?? card.issue_type}
            </span>
          )}
          {visibleLabels.map((label) => (
            <span
              key={label}
              className="rounded-full bg-gray-700/80 px-2 py-0.5 text-[10px] text-gray-300"
            >
              {label}
            </span>
          ))}
          {extraLabelCount > 0 && (
            <span className="text-[10px] text-gray-500">+{extraLabelCount}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2 text-gray-400">
          {card.due_date && (
            <span className="flex items-center gap-1 text-xs">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {formatDueDate(card.due_date)}
            </span>
          )}
        </div>

        {assigneeName && (
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-xs font-semibold text-white"
            title={assigneeName}
          >
            {getInitials(assigneeName)}
          </div>
        )}
      </div>
    </div>
  );
}
