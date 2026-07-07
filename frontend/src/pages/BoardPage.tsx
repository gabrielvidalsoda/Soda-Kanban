import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { boardApi, workspaceApi } from "../api/client";
import { BoardFilters } from "../components/BoardFilters";
import { KanbanBoard } from "../components/KanbanBoard";
import { CardDetailModal } from "../components/CardDetailModal";
import { CardFormModal, type CardFormData } from "../components/CardFormModal";
import { ImportTasksModal } from "../components/ImportTasksModal";
import { AppHeader } from "../components/layout/AppHeader";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { btnDanger, btnPrimary, btnSecondary, inputClass } from "../components/ui/styles";
import { exportBoardTasksCsv } from "../utils/csvTasks";
import {
  collectBoardLabels,
  emptyBoardFilters,
  filterCards,
  hasActiveFilters,
  type BoardFilterState,
} from "../utils/boardFilters";
import { useBoardSocket } from "../hooks/useBoardSocket";
import { useAuthStore } from "../store/auth";
import type { BoardEvent, Card } from "../types";

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [visibility, setVisibility] = useState<string>("");
  const [cardFormOpen, setCardFormOpen] = useState(false);
  const [targetListId, setTargetListId] = useState<string>("");
  const [deleteBoardOpen, setDeleteBoardOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [filters, setFilters] = useState<BoardFilterState>(() => emptyBoardFilters());

  const { data, isLoading } = useQuery({
    queryKey: ["board", boardId],
    queryFn: () => boardApi.detail(boardId!).then((r) => r.data),
    enabled: !!boardId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["workspace-members", data?.board.workspace_id],
    queryFn: () => workspaceApi.members(data!.board.workspace_id).then((r) => r.data),
    enabled: !!data?.board.workspace_id,
  });

  const assigneeNames = Object.fromEntries(members.map((m) => [m.user_id, m.user.name]));

  const currentMembership = members.find((m) => m.user_id === currentUser?.id);
  const isAdmin =
    currentMembership?.role === "owner" || currentMembership?.role === "admin";

  const moveMutation = useMutation({
    mutationFn: ({ cardId, listId, position }: { cardId: string; listId: string; position: number }) =>
      boardApi.moveCard(cardId, listId, position),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["board", boardId] }),
  });

  const updateBoard = useMutation({
    mutationFn: (vis: string) => boardApi.update(boardId!, { visibility: vis as "private" | "team" | "public" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["board", boardId] }),
  });

  const createCard = useMutation({
    mutationFn: ({ listId, ...payload }: CardFormData & { listId: string }) =>
      boardApi.createCard(listId, {
        title: payload.title,
        description: payload.description || null,
        issue_type: payload.issue_type,
        status: payload.status,
        priority: payload.priority,
        labels: payload.labels,
        acceptance_criteria: payload.acceptance_criteria,
        due_date: payload.due_date || null,
        assignee_id: payload.assignee_id || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      setCardFormOpen(false);
    },
  });

  const deleteBoard = useMutation({
    mutationFn: () => boardApi.deleteBoard(boardId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards", data?.board.workspace_id] });
      navigate(`/workspaces/${data!.board.workspace_id}`);
    },
  });

  const handleSocketEvent = useCallback(
    (event: BoardEvent) => {
      if (["card.moved", "card.updated", "card.created", "card.deleted", "list.created"].includes(event.type)) {
        queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      }
    },
    [boardId, queryClient]
  );

  useBoardSocket(boardId, handleSocketEvent);

  const openCardForm = (listId?: string) => {
    setTargetListId(listId ?? data?.lists[0]?.id ?? "");
    setCardFormOpen(true);
  };

  const handleCreateCard = (formData: CardFormData) => {
    if (!targetListId) return;
    createCard.mutate({ listId: targetListId, ...formData });
  };

  const boardLabels = useMemo(
    () => collectBoardLabels(data?.cards ?? []),
    [data?.cards]
  );
  const filteredCards = useMemo(
    () => filterCards(data?.cards ?? [], filters),
    [data?.cards, filters]
  );
  const filtersActive = hasActiveFilters(filters);

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Loading board...</p>
      </div>
    );
  }

  const currentVisibility = visibility || data.board.visibility;

  return (
    <div className="min-h-screen bg-gray-950">
      <AppHeader
        backTo={{ label: "Back to boards", href: `/workspaces/${data.board.workspace_id}` }}
        title={data.board.name}
        actions={
          <>
            <select
              value={currentVisibility}
              onChange={(e) => {
                setVisibility(e.target.value);
                updateBoard.mutate(e.target.value);
              }}
              className={`${inputClass} w-auto py-1.5`}
            >
              <option value="private">Private</option>
              <option value="team">Team</option>
              <option value="public">Public</option>
            </select>
            <button
              type="button"
              onClick={() => exportBoardTasksCsv(data, members)}
              className={btnSecondary}
            >
              Export
            </button>
            <button
              type="button"
              onClick={() => setImportModalOpen(true)}
              className={btnSecondary}
            >
              Import
            </button>
            <button onClick={() => openCardForm()} className={btnPrimary}>
              Add card
            </button>
            {isAdmin && (
              <button type="button" onClick={() => setDeleteBoardOpen(true)} className={btnDanger}>
                Delete board
              </button>
            )}
          </>
        }
      />

      <ConfirmModal
        open={deleteBoardOpen}
        onClose={() => setDeleteBoardOpen(false)}
        onConfirm={() => deleteBoard.mutate()}
        title="Delete board"
        message={`Delete "${data.board.name}" and all its lists and cards? This cannot be undone.`}
        isSubmitting={deleteBoard.isPending}
      />

      <main className="p-4 md:p-6">
        <BoardFilters
          filters={filters}
          onChange={setFilters}
          boardLabels={boardLabels}
          members={members}
          filteredCount={filteredCards.length}
          totalCount={data.cards.length}
        />
        <KanbanBoard
          lists={data.lists}
          cards={filteredCards}
          assigneeNames={assigneeNames}
          onMoveCard={(cardId, listId, position) => moveMutation.mutate({ cardId, listId, position })}
          onSelectCard={setSelectedCard}
          onAddCard={openCardForm}
          dragDisabled={filtersActive}
        />
      </main>

      <CardDetailModal
        card={selectedCard}
        boardCards={data.cards}
        onClose={() => setSelectedCard(null)}
        members={members}
      />

      <CardFormModal
        open={cardFormOpen}
        onClose={() => setCardFormOpen(false)}
        onSubmit={handleCreateCard}
        isSubmitting={createCard.isPending}
        lists={data.lists}
        listId={targetListId}
        onListChange={setTargetListId}
        members={members}
      />

      <ImportTasksModal
        open={importModalOpen}
        boardId={boardId!}
        onClose={() => setImportModalOpen(false)}
      />
    </div>
  );
}
