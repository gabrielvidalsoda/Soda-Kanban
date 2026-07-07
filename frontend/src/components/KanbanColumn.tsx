import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { BoardList, Card } from "../types";
import { SortableCard } from "./SortableCard";

interface KanbanColumnProps {
  list: BoardList;
  cards: Card[];
  assigneeNames: Record<string, string>;
  onSelectCard: (card: Card) => void;
  onAddCard: (listId: string) => void;
  dragDisabled?: boolean;
}

export function KanbanColumn({
  list,
  cards,
  assigneeNames,
  onSelectCard,
  onAddCard,
  dragDisabled,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `list-${list.id}` });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 bg-gray-900/80 rounded-xl p-3 flex flex-col max-h-[calc(100vh-10rem)] ${
        isOver ? "ring-2 ring-blue-500/60" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-white text-sm">{list.name}</h3>
          <span className="text-xs text-gray-500 font-medium">{cards.length}</span>
        </div>
        <button
          className="rounded p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
          aria-label="List options"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </div>

      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 min-h-[60px] flex-1 overflow-y-auto">
          {cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              assigneeName={card.assignee_id ? assigneeNames[card.assignee_id] : undefined}
              onSelect={() => onSelectCard(card)}
              dragDisabled={dragDisabled}
            />
          ))}
        </div>
      </SortableContext>

      <button
        onClick={() => onAddCard(list.id)}
        className="mt-2 flex w-full items-center justify-between rounded-lg px-2 py-2.5 text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors group"
      >
        <span className="flex items-center gap-1.5">
          <span className="text-base leading-none">+</span>
          Add a card
        </span>
        <span className="opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </span>
      </button>
    </div>
  );
}
