import { useEffect, useState } from "react";
import type { AcceptanceCriterionItem, BoardList, TaskIssueType, TaskPriority, TaskStatus, WorkspaceMember } from "../types";
import { statusForListId } from "../entities/boardWorkflow";
import { CardFields } from "./CardFields";
import { Modal } from "./ui/Modal";
import { btnPrimary, btnSecondary, inputClass, labelClass } from "./ui/styles";
import {
  hasCardFormErrors,
  validateCardForm,
  type CardFormErrors,
} from "../utils/cardValidation";

export interface CardFormData {
  title: string;
  description: string;
  issue_type: TaskIssueType;
  status: TaskStatus;
  priority: TaskPriority | null;
  labels: string[];
  acceptance_criteria: AcceptanceCriterionItem[];
  due_date: string;
  assignee_id: string;
}

interface CardFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CardFormData) => void;
  isSubmitting?: boolean;
  lists?: BoardList[];
  listId?: string;
  onListChange?: (listId: string) => void;
  members: WorkspaceMember[];
}

export function CardFormModal({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  lists,
  listId,
  onListChange,
  members,
}: CardFormModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [issueType, setIssueType] = useState<TaskIssueType>("task");
  const [status, setStatus] = useState<TaskStatus>("backlog");
  const [priority, setPriority] = useState<TaskPriority | "">("");
  const [labels, setLabels] = useState<string[]>([]);
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<AcceptanceCriterionItem[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [errors, setErrors] = useState<CardFormErrors>({});

  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setIssueType("task");
      setStatus(statusForListId(listId, lists));
      setPriority("");
      setLabels([]);
      setAcceptanceCriteria([]);
      setDueDate("");
      setAssigneeId("");
      setErrors({});
    }
  }, [open, listId, lists]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formErrors = validateCardForm({
      title,
      description,
      due_date: dueDate,
      assignee_id: assigneeId,
    });
    setErrors(formErrors);
    if (hasCardFormErrors(formErrors)) return;

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      issue_type: issueType,
      status,
      priority: priority || null,
      labels,
      acceptance_criteria: acceptanceCriteria.filter((item) => item.text.trim()),
      due_date: dueDate,
      assignee_id: assigneeId,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Add card">
      <form onSubmit={handleSubmit} className="space-y-4">
        {lists && lists.length > 1 && (
          <div>
            <label className={labelClass}>List</label>
            <select
              value={listId}
              onChange={(e) => {
                const newListId = e.target.value;
                onListChange?.(newListId);
                setStatus(statusForListId(newListId, lists));
              }}
              className={inputClass}
            >
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <CardFields
          values={{
            title,
            description,
            issue_type: issueType,
            status,
            priority,
            labels,
            acceptance_criteria: acceptanceCriteria,
            dependency_ids: [],
            due_date: dueDate,
            assignee_id: assigneeId,
          }}
          errors={errors}
          members={members}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
          onIssueTypeChange={setIssueType}
          onStatusChange={setStatus}
          onPriorityChange={setPriority}
          onLabelsChange={setLabels}
          onAcceptanceCriteriaChange={setAcceptanceCriteria}
          onDependencyIdsChange={() => {}}
          onDueDateChange={setDueDate}
          onAssigneeChange={setAssigneeId}
          autoFocusTitle
        />

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className={btnPrimary}>
            {isSubmitting ? "Creating..." : "Create card"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
