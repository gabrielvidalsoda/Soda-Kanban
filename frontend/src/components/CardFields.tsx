import type {
  AcceptanceCriterionItem,
  Card,
  TaskIssueType,
  TaskPriority,
  TaskStatus,
  WorkspaceMember,
} from "../types";
import {
  TASK_ISSUE_TYPE_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
} from "../entities/taskFields";
import { AcceptanceCriteriaEditor } from "./AcceptanceCriteriaEditor";
import { CardDependenciesLabel, CardDependenciesPicker } from "./CardDependenciesPicker";
import { LabelsInput } from "./LabelsInput";
import { DatePicker } from "./ui/DatePicker";
import { errorClass, inputClass, inputErrorClass, labelClass } from "./ui/styles";
import type { CardFormErrors } from "../utils/cardValidation";

export interface CardFieldValues {
  title: string;
  description: string;
  issue_type: TaskIssueType;
  status: TaskStatus;
  priority: TaskPriority | "";
  labels: string[];
  acceptance_criteria: AcceptanceCriterionItem[];
  dependency_ids: string[];
  due_date: string;
  assignee_id: string;
}

interface CardFieldsProps {
  values: CardFieldValues;
  errors: CardFormErrors;
  members: WorkspaceMember[];
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onIssueTypeChange: (value: TaskIssueType) => void;
  onStatusChange: (value: TaskStatus) => void;
  onPriorityChange: (value: TaskPriority | "") => void;
  onLabelsChange: (value: string[]) => void;
  onAcceptanceCriteriaChange: (value: AcceptanceCriterionItem[]) => void;
  onDependencyIdsChange: (value: string[]) => void;
  onDueDateChange: (value: string) => void;
  onAssigneeChange: (value: string) => void;
  autoFocusTitle?: boolean;
  cardId?: string;
  boardCards?: Card[];
  showDependencies?: boolean;
}

export function CardFields({
  values,
  errors,
  members,
  onTitleChange,
  onDescriptionChange,
  onIssueTypeChange,
  onStatusChange,
  onPriorityChange,
  onLabelsChange,
  onAcceptanceCriteriaChange,
  onDependencyIdsChange,
  onDueDateChange,
  onAssigneeChange,
  autoFocusTitle,
  cardId,
  boardCards = [],
  showDependencies = false,
}: CardFieldsProps) {
  return (
    <>
      <div>
        <label className={labelClass}>Summary</label>
        <input
          className={`${inputClass} ${errors.title ? inputErrorClass : ""}`}
          value={values.title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="What needs to be done?"
          autoFocus={autoFocusTitle}
        />
        {errors.title && <p className={errorClass}>{errors.title}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Issue Type</label>
          <select
            className={inputClass}
            value={values.issue_type}
            onChange={(e) => onIssueTypeChange(e.target.value as TaskIssueType)}
          >
            {TASK_ISSUE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select
            className={inputClass}
            value={values.status}
            onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
          >
            {TASK_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Priority</label>
          <select
            className={inputClass}
            value={values.priority}
            onChange={(e) => onPriorityChange(e.target.value as TaskPriority | "")}
          >
            <option value="">None</option>
            {TASK_PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea
          className={`${inputClass} min-h-[100px] resize-y ${errors.description ? inputErrorClass : ""}`}
          value={values.description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Add a description..."
        />
        {errors.description && <p className={errorClass}>{errors.description}</p>}
      </div>

      <div>
        <label className={labelClass}>Labels</label>
        <LabelsInput labels={values.labels} onChange={onLabelsChange} />
      </div>

      <div>
        <label className={labelClass}>Acceptance criteria</label>
        <AcceptanceCriteriaEditor
          items={values.acceptance_criteria}
          onChange={onAcceptanceCriteriaChange}
        />
      </div>

      {showDependencies && cardId && (
        <div>
          <CardDependenciesLabel />
          <CardDependenciesPicker
            cardId={cardId}
            dependencyIds={values.dependency_ids}
            boardCards={boardCards}
            onChange={onDependencyIdsChange}
          />
        </div>
      )}

      <div>
        <label className={labelClass}>Assignee</label>
        <select
          className={inputClass}
          value={values.assignee_id}
          onChange={(e) => onAssigneeChange(e.target.value)}
        >
          <option value="">Unassigned</option>
          {members.map((member) => (
            <option key={member.user_id} value={member.user_id}>
              {member.user.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Due date</label>
        <DatePicker value={values.due_date} onChange={onDueDateChange} disablePast />
        {errors.due_date && <p className={errorClass}>{errors.due_date}</p>}
      </div>
    </>
  );
}
