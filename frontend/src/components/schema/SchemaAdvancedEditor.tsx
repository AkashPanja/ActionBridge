import { Redo2, Undo2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onValidJson: (json: Record<string, unknown>) => void;
  readOnly?: boolean;
}

const MAX_HISTORY = 50;

export function SchemaAdvancedEditor({ value, onChange, onValidJson, readOnly }: Props) {
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isUndoingRef = useRef(false);

  // Validate JSON and report
  useEffect(() => {
    if (!value.trim()) {
      setError(null);
      return;
    }
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed !== "object" || parsed === null) {
        setError("Root must be a JSON object");
        return;
      }
      setError(null);
      onValidJson(parsed);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [value]);

  function pushUndo(newValue: string) {
    if (isUndoingRef.current) return;
    setUndoStack((prev) => {
      const next = [...prev, newValue];
      return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
    });
    setRedoStack([]);
  }

  function handleChange(newValue: string) {
    pushUndo(value);
    onChange(newValue);
  }

  function handleUndo() {
    if (undoStack.length === 0) return;
    isUndoingRef.current = true;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((s) => [...s, value]);
    onChange(prev);
    setTimeout(() => { isUndoingRef.current = false; }, 0);
  }

  function handleRedo() {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((s) => [...s, value]);
    onChange(next);
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    },
    [value, undoStack, redoStack],
  );

  return (
    <div className="space-y-2">
      {!readOnly ? (
        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-surface-600 transition-colors hover:bg-surface-100 disabled:opacity-30 dark:text-surface-400 dark:hover:bg-surface-700"
          >
            <Undo2 className="h-3.5 w-3.5" /> Undo
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-surface-600 transition-colors hover:bg-surface-100 disabled:opacity-30 dark:text-surface-400 dark:hover:bg-surface-700"
          >
            <Redo2 className="h-3.5 w-3.5" /> Redo
          </button>
          <span className="text-xs text-surface-400">
            Ctrl+Z / Ctrl+Y
          </span>
        </div>
      ) : null}

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={readOnly ? undefined : handleKeyDown}
        rows={16}
        readOnly={readOnly}
        className={`w-full rounded-xl border bg-surface-50 px-4 py-3 font-mono text-xs leading-relaxed text-surface-900 focus:outline-none focus:ring-2 dark:bg-surface-800 dark:text-surface-100 ${
          readOnly ? "cursor-default" : ""
        } ${
          error
            ? "border-accent-400 focus:ring-accent-500/20"
            : "border-surface-300 focus:border-brand-500 focus:ring-brand-500/20 dark:border-surface-600"
        }`}
        spellCheck={false}
      />

      {error ? (
        <div className="flex items-start gap-2 rounded-lg bg-accent-50 px-3 py-2 dark:bg-accent-900/20">
          <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-xs text-accent-600 dark:text-accent-400">{error}</p>
        </div>
      ) : value.trim() ? (
        <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-900/20">
          <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">Valid JSON Schema</p>
        </div>
      ) : null}
    </div>
  );
}
