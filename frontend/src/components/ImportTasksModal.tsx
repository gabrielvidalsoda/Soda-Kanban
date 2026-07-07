import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { boardApi } from "../api/client";
import type { CardImportResult } from "../types";
import { Modal } from "./ui/Modal";
import { btnPrimary, btnSecondary, errorClass } from "./ui/styles";
import { TASK_CSV_EXAMPLE, downloadCsv } from "../utils/csvTasks";

interface ImportTasksModalProps {
  open: boolean;
  boardId: string;
  onClose: () => void;
}

function isCsvFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";
}

export function ImportTasksModal({ open, boardId, onClose }: ImportTasksModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState("");
  const [importResult, setImportResult] = useState<CardImportResult | null>(null);

  const resetState = useCallback(() => {
    setSelectedFile(null);
    setDragOver(false);
    setFileError("");
    setImportResult(null);
  }, []);

  const handleClose = () => {
    resetState();
    onClose();
  };

  const acceptFile = (file: File | undefined) => {
    if (!file) return;
    if (!isCsvFile(file)) {
      setFileError("Please select a .csv file.");
      setSelectedFile(null);
      return;
    }
    setFileError("");
    setImportResult(null);
    setSelectedFile(file);
  };

  const importMutation = useMutation({
    mutationFn: (file: File) => boardApi.importCards(boardId, file).then((r) => r.data),
    onSuccess: (result) => {
      setImportResult(result);
      if (result.created > 0) {
        queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      }
      if (result.created > 0 && result.errors.length === 0) {
        handleClose();
      }
    },
    onError: () => {
      setFileError("Import failed. Check your file and try again.");
    },
  });

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    acceptFile(e.dataTransfer.files[0]);
  };

  const handleDownloadExample = () => {
    downloadCsv(TASK_CSV_EXAMPLE, "tasks-import-example.csv");
  };

  return (
    <Modal open={open} onClose={handleClose} title="Import tasks" size="lg">
      <div className="space-y-5">
        <p className="text-sm text-gray-400">
          Upload a CSV file to add tasks to this board. Existing tasks will not be removed.
        </p>

        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <p className="text-sm text-gray-300 mb-2">Need a template?</p>
          <button type="button" onClick={handleDownloadExample} className={btnSecondary}>
            Download example CSV
          </button>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors cursor-pointer ${
            dragOver
              ? "border-blue-500 bg-blue-500/10"
              : "border-gray-600 bg-gray-800/30 hover:border-gray-500"
          }`}
        >
          <svg
            className="mb-3 h-10 w-10 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
          <p className="text-sm font-medium text-gray-200">
            Drag and drop a CSV file here, or click to browse
          </p>
          <p className="mt-1 text-xs text-gray-500">Only .csv files are supported</p>
          {selectedFile && (
            <p className="mt-3 text-sm text-blue-400">{selectedFile.name}</p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => acceptFile(e.target.files?.[0])}
          />
        </div>

        {fileError && <p className={errorClass}>{fileError}</p>}

        {importResult && (
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 space-y-2">
            <p className="text-sm text-green-400">
              {importResult.created} task{importResult.created === 1 ? "" : "s"} imported successfully.
            </p>
            {importResult.errors.length > 0 && (
              <div>
                <p className="text-sm text-amber-400 mb-2">
                  {importResult.errors.length} row{importResult.errors.length === 1 ? "" : "s"} skipped:
                </p>
                <ul className="max-h-40 overflow-y-auto space-y-1 text-xs text-gray-400">
                  {importResult.errors.map((err) => (
                    <li key={`${err.row}-${err.message}`}>
                      Row {err.row}: {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={handleClose} className={btnSecondary}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => selectedFile && importMutation.mutate(selectedFile)}
            disabled={!selectedFile || importMutation.isPending}
            className={btnPrimary}
          >
            {importMutation.isPending ? "Importing..." : "Import"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
