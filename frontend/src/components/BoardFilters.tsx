import type { WorkspaceMember } from "../types";
import {
  TASK_ISSUE_TYPE_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
} from "../entities/taskFields";
import {
  emptyBoardFilters,
  hasActiveFilters,
  type BoardFilterState,
} from "../utils/boardFilters";
import { DatePicker } from "./ui/DatePicker";
import { MultiSelect } from "./ui/MultiSelect";
import { btnSecondary, inputClass } from "./ui/styles";

interface BoardFiltersProps {
  filters: BoardFilterState;
  onChange: (filters: BoardFilterState) => void;
  boardLabels: string[];
  members: WorkspaceMember[];
  filteredCount: number;
  totalCount: number;
}

export function BoardFilters({
  filters,
  onChange,
  boardLabels,
  members,
  filteredCount,
  totalCount,
}: BoardFiltersProps) {
  const update = (partial: Partial<BoardFilterState>) => {
    onChange({ ...filters, ...partial });
  };

  const clearFilters = () => {
    onChange(emptyBoardFilters());
  };

  const handleDateFieldChange = (value: string) => {
    const dateField = value as BoardFilterState["dateField"];
    if (!dateField) {
      update({ dateField: "", dateFrom: "", dateTo: "" });
      return;
    }
    update({ dateField });
  };

  const filtersActive = hasActiveFilters(filters);
  const showDateRange = filters.dateField !== "";

  return (
    <div className="mb-4 space-y-3 rounded-xl border border-gray-800 bg-gray-900/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <MultiSelect
          label="Issue type"
          options={TASK_ISSUE_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          selected={filters.issueTypes}
          onChange={(issueTypes) => update({ issueTypes })}
        />
        <MultiSelect
          label="Status"
          options={TASK_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          selected={filters.statuses}
          onChange={(statuses) => update({ statuses })}
        />
        <MultiSelect
          label="Priority"
          options={[
            ...TASK_PRIORITY_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
            { value: "none" as const, label: "No priority" },
          ]}
          selected={filters.priorities}
          onChange={(priorities) => update({ priorities })}
        />
        <MultiSelect
          label="Labels"
          options={boardLabels.map((label) => ({ value: label, label }))}
          selected={filters.labels}
          onChange={(labels) => update({ labels })}
          emptyMessage="No labels on this board"
        />
        <MultiSelect
          label="Assignee"
          options={[
            { value: "unassigned" as const, label: "Unassigned" },
            ...members.map((m) => ({ value: m.user_id, label: m.user.name })),
          ]}
          selected={filters.assigneeIds}
          onChange={(assigneeIds) => update({ assigneeIds })}
        />

        <div className="hidden sm:block h-6 w-px bg-gray-700 mx-1" aria-hidden />

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500 shrink-0">Date</span>
          <select
            value={filters.dateField}
            onChange={(e) => handleDateFieldChange(e.target.value)}
            className={`${inputClass} w-auto py-1.5 ${!filters.dateField ? "text-gray-400" : ""}`}
          >
            <option value="">Select date type</option>
            <option value="due_date">Due date</option>
            <option value="created_at">Created date</option>
          </select>
          {showDateRange && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">From</span>
                <DatePicker
                  value={filters.dateFrom}
                  onChange={(dateFrom) => update({ dateFrom })}
                  placeholder="Start"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">To</span>
                <DatePicker
                  value={filters.dateTo}
                  onChange={(dateTo) => update({ dateTo })}
                  placeholder="End"
                />
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={clearFilters}
          disabled={!filtersActive}
          className={`${btnSecondary} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          Clear filters
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          {filtersActive && (
            <span className="text-xs text-gray-500 italic">
              Reorder disabled while filters are active
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400">
          Showing {filteredCount} of {totalCount} task{totalCount === 1 ? "" : "s"}
        </p>
      </div>
    </div>
  );
}
