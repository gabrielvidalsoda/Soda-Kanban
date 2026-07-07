import type { Card } from "../types";
import { labelClass } from "./ui/styles";

interface CardDependenciesPickerProps {
  cardId: string;
  dependencyIds: string[];
  boardCards: Card[];
  onChange: (dependencyIds: string[]) => void;
}

export function CardDependenciesPicker({
  cardId,
  dependencyIds,
  boardCards,
  onChange,
}: CardDependenciesPickerProps) {
  const candidates = boardCards
    .filter((c) => c.id !== cardId)
    .sort((a, b) => a.title.localeCompare(b.title));

  const toggle = (id: string) => {
    if (dependencyIds.includes(id)) {
      onChange(dependencyIds.filter((depId) => depId !== id));
    } else {
      onChange([...dependencyIds, id]);
    }
  };

  if (candidates.length === 0) {
    return <p className="text-sm text-gray-500">No other cards on this board.</p>;
  }

  return (
    <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-gray-700 bg-gray-900/50 p-2">
      {candidates.map((card) => (
        <label
          key={card.id}
          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-800"
        >
          <input
            type="checkbox"
            checked={dependencyIds.includes(card.id)}
            onChange={() => toggle(card.id)}
            className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-500"
          />
          <span className="text-gray-200">{card.title}</span>
        </label>
      ))}
    </div>
  );
}

export function CardDependenciesLabel() {
  return (
    <label className={labelClass}>
      Dependencies
      <span className="ml-1 text-xs font-normal text-gray-500">(same board)</span>
    </label>
  );
}
