import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AcceptanceCriterionItem, Card, TaskIssueType, TaskPriority, TaskStatus, WorkspaceMember } from "../types";
import { boardApi } from "../api/client";
import { CardFields } from "./CardFields";
import { CardAttachments } from "./CardAttachments";
import { ConfirmModal } from "./ui/ConfirmModal";
import { Modal } from "./ui/Modal";
import { btnDanger, btnPrimary, inputClass } from "./ui/styles";
import {
  hasCardFormErrors,
  validateCardForm,
  type CardFormErrors,
} from "../utils/cardValidation";

interface CardDetailModalProps {
  card: Card | null;
  boardCards: Card[];
  onClose: () => void;
  members: WorkspaceMember[];
}

export function CardDetailModal({ card, boardCards, onClose, members }: CardDetailModalProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [issueType, setIssueType] = useState<TaskIssueType>("task");
  const [status, setStatus] = useState<TaskStatus>("backlog");
  const [priority, setPriority] = useState<TaskPriority | "">("");
  const [labels, setLabels] = useState<string[]>([]);
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<AcceptanceCriterionItem[]>([]);
  const [dependencyIds, setDependencyIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [comment, setComment] = useState("");
  const [errors, setErrors] = useState<CardFormErrors>({});
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description ?? "");
      setIssueType(card.issue_type);
      setStatus(card.status);
      setPriority(card.priority ?? "");
      setLabels(card.labels ?? []);
      setAcceptanceCriteria(card.acceptance_criteria ?? []);
      setDependencyIds(card.dependency_ids ?? []);
      setDueDate(card.due_date ? card.due_date.slice(0, 10) : "");
      setAssigneeId(card.assignee_id ?? "");
      setErrors({});
    }
  }, [card]);

  const { data: comments = [] } = useQuery({
    queryKey: ["comments", card?.id],
    queryFn: () => boardApi.comments(card!.id).then((r) => r.data),
    enabled: !!card,
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      boardApi.updateCard(card!.id, {
        title: title.trim(),
        description: description.trim() || null,
        issue_type: issueType,
        status,
        priority: priority || null,
        labels,
        acceptance_criteria: acceptanceCriteria.filter((item) => item.text.trim()),
        dependency_ids: dependencyIds,
        due_date: dueDate || null,
        assignee_id: assigneeId || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: () => boardApi.addComment(card!.id, comment),
    onSuccess: () => {
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["comments", card?.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => boardApi.deleteCard(card!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
      setDeleteOpen(false);
      onClose();
    },
  });

  const handleSave = () => {
    const formErrors = validateCardForm({
      title,
      description,
      due_date: dueDate,
      assignee_id: assigneeId,
    });
    setErrors(formErrors);
    if (hasCardFormErrors(formErrors)) return;
    updateMutation.mutate();
  };

  return (
    <Modal open={!!card} onClose={onClose} title="Card details" size="lg">
      {card && (
        <div className="space-y-4">
          <CardFields
            values={{
              title,
              description,
              issue_type: issueType,
              status,
              priority,
              labels,
              acceptance_criteria: acceptanceCriteria,
              dependency_ids: dependencyIds,
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
            onDependencyIdsChange={setDependencyIds}
            onDueDateChange={setDueDate}
            onAssigneeChange={setAssigneeId}
            cardId={card.id}
            boardCards={boardCards}
            showDependencies
          />

          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className={`w-full ${btnPrimary} py-2.5`}
          >
            {updateMutation.isPending ? "Saving..." : "Save changes"}
          </button>

          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className={`w-full ${btnDanger} py-2.5`}
          >
            Delete card
          </button>

          <ConfirmModal
            open={deleteOpen}
            onClose={() => setDeleteOpen(false)}
            onConfirm={() => deleteMutation.mutate()}
            title="Delete card"
            message={`Delete "${card.title}"? This cannot be undone.`}
            isSubmitting={deleteMutation.isPending}
          />

          <CardAttachments cardId={card.id} />

          <div className="border-t border-gray-700 pt-4">
            <h3 className="mb-3 text-sm font-medium text-gray-300">Comments</h3>
            <div className="space-y-2 mb-4">
              {comments.length === 0 && (
                <p className="text-sm text-gray-500">No comments yet.</p>
              )}
              {comments.map((c) => (
                <div key={c.id} className="rounded-lg bg-gray-800 p-3 text-sm">
                  <p className="font-medium text-gray-200">{c.author.name}</p>
                  <p className="text-gray-400 mt-0.5">{c.content}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className={`${inputClass} flex-1`}
                placeholder="Add a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && comment.trim()) commentMutation.mutate();
                }}
              />
              <button
                onClick={() => commentMutation.mutate()}
                disabled={!comment.trim() || commentMutation.isPending}
                className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
