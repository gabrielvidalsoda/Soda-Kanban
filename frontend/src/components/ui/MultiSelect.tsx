import { useEffect, useRef, useState } from "react";
import { inputClass } from "./styles";

export interface MultiSelectOption<T extends string = string> {
  value: T;
  label: string;
}

interface MultiSelectProps<T extends string = string> {
  label: string;
  options: MultiSelectOption<T>[];
  selected: T[];
  onChange: (selected: T[]) => void;
  emptyMessage?: string;
}

export function MultiSelect<T extends string = string>({
  label,
  options,
  selected,
  onChange,
  emptyMessage = "No options",
}: MultiSelectProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const toggle = (value: T) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const triggerLabel =
    selected.length > 0 ? `${label} (${selected.length})` : label;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`${inputClass} w-auto min-w-[120px] py-1.5 flex items-center justify-between gap-2 text-left`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={selected.length > 0 ? "text-white" : "text-gray-400"}>
          {triggerLabel}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-40 mt-1 min-w-[180px] max-h-60 overflow-y-auto rounded-lg border border-gray-600 bg-gray-800 py-1 shadow-xl"
          role="listbox"
          aria-multiselectable
        >
          {options.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-500">{emptyMessage}</p>
          ) : (
            options.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700/80"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option.value)}
                  onChange={() => toggle(option.value)}
                  className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800"
                />
                <span>{option.label}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}
