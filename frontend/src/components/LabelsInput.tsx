import { useState } from "react";
import { inputClass } from "./ui/styles";

interface LabelsInputProps {
  labels: string[];
  onChange: (labels: string[]) => void;
}

export function LabelsInput({ labels, onChange }: LabelsInputProps) {
  const [draft, setDraft] = useState("");

  const addLabel = () => {
    const label = draft.trim();
    if (!label || labels.includes(label)) return;
    onChange([...labels, label]);
    setDraft("");
  };

  const removeLabel = (label: string) => {
    onChange(labels.filter((l) => l !== label));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {labels.map((label) => (
          <span
            key={label}
            className="inline-flex items-center gap-1 rounded-full bg-gray-700 px-2.5 py-0.5 text-xs text-gray-200"
          >
            {label}
            <button
              type="button"
              onClick={() => removeLabel(label)}
              className="text-gray-400 hover:text-white"
              aria-label={`Remove ${label}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className={`${inputClass} flex-1 py-1.5`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add label..."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addLabel();
            }
          }}
        />
        <button
          type="button"
          onClick={addLabel}
          className="rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-600"
        >
          Add
        </button>
      </div>
    </div>
  );
}
