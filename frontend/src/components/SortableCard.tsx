import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Card } from "../types";
import { CardItem } from "./CardItem";

interface SortableCardProps {
  card: Card;
  assigneeName?: string;
  onSelect: () => void;
  dragDisabled?: boolean;
}

export function SortableCard({ card, assigneeName, onSelect, dragDisabled }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    disabled: dragDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(dragDisabled ? {} : listeners)}
    >
      <CardItem card={card} assigneeName={assigneeName} onClick={onSelect} />
    </div>
  );
}
