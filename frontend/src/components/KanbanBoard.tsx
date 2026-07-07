import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useState } from "react";
import type { BoardList, Card } from "../types";
import { KanbanColumn } from "./KanbanColumn";
import { CardItem } from "./CardItem";

interface KanbanBoardProps {
  lists: BoardList[];
  cards: Card[];
  assigneeNames: Record<string, string>;
  onMoveCard: (cardId: string, listId: string, position: number) => void;
  onSelectCard: (card: Card) => void;
  onAddCard: (listId: string) => void;
  dragDisabled?: boolean;
}

export function KanbanBoard({
  lists,
  cards,
  assigneeNames,
  onMoveCard,
  onSelectCard,
  onAddCard,
  dragDisabled,
}: KanbanBoardProps) {
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const cardsByList = lists.reduce<Record<string, Card[]>>((acc, list) => {
    acc[list.id] = cards.filter((c) => c.list_id === list.id).sort((a, b) => a.position - b.position);
    return acc;
  }, {});

  const handleDragStart = (event: DragStartEvent) => {
    if (dragDisabled) return;
    const card = cards.find((c) => c.id === event.active.id);
    if (card) setActiveCard(card);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (dragDisabled) return;
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const cardId = String(active.id);
    const overId = String(over.id);
    const targetListId = overId.startsWith("list-") ? overId.replace("list-", "") : cards.find((c) => c.id === overId)?.list_id;
    if (!targetListId) return;

    const targetCards = cardsByList[targetListId] ?? [];
    const position = overId.startsWith("list-") ? targetCards.length : targetCards.findIndex((c) => c.id === overId);
    onMoveCard(cardId, targetListId, Math.max(0, position));
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[70vh]">
        {lists.map((list) => (
          <KanbanColumn
            key={list.id}
            list={list}
            cards={cardsByList[list.id] ?? []}
            assigneeNames={assigneeNames}
            onSelectCard={onSelectCard}
            onAddCard={onAddCard}
            dragDisabled={dragDisabled}
          />
        ))}

        <button
          className="flex-shrink-0 w-72 h-fit rounded-xl border-2 border-dashed border-gray-700 p-4 text-gray-500 hover:border-gray-500 hover:text-gray-400 transition-colors flex items-center justify-center gap-2"
          aria-label="Add list"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-sm">Add list</span>
        </button>
      </div>
      <DragOverlay>
        {activeCard ? (
          <CardItem
            card={activeCard}
            assigneeName={activeCard.assignee_id ? assigneeNames[activeCard.assignee_id] : undefined}
            isDragging
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
