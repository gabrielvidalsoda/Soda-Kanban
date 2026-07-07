import { useState } from "react";
import type { AcceptanceCriterionItem } from "../types";
import { btnSecondary, inputClass } from "./ui/styles";

interface AcceptanceCriteriaEditorProps {
  items: AcceptanceCriterionItem[];
  onChange: (items: AcceptanceCriterionItem[]) => void;
}

export function AcceptanceCriteriaEditor({ items, onChange }: AcceptanceCriteriaEditorProps) {
  const [draft, setDraft] = useState("");

  const addItem = () => {
    const text = draft.trim();
    if (!text) return;
    onChange([...items, { text, done: false }]);
    setDraft("");
  };

  const toggleItem = (index: number) => {
    onChange(items.map((item, i) => (i === index ? { ...item, done: !item.done } : item)));
  };

  const updateText = (index: number, text: string) => {
    onChange(items.map((item, i) => (i === index ? { ...item, text } : item)));
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={item.done}
            onChange={() => toggleItem(index)}
            className="mt-2.5 h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-500"
          />
          <input
            className={`${inputClass} flex-1 py-1.5`}
            value={item.text}
            onChange={(e) => updateText(index, e.target.value)}
          />
          <button
            type="button"
            onClick={() => removeItem(index)}
            className="mt-1 text-xs text-gray-500 hover:text-red-400"
          >
            Remove
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          className={`${inputClass} flex-1 py-1.5`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add acceptance criterion..."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
        />
        <button type="button" onClick={addItem} className={`${btnSecondary} py-1.5 text-xs`}>
          Add
        </button>
      </div>
    </div>
  );
}
