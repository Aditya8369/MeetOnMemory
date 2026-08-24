import React, { useMemo, useState } from "react";
import {
  Archive,
  Check,
  Clock3,
  Loader2,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { knowledgeApi } from "../services";

const TARGETS = [
  { value: "active", label: "Restore to active", icon: RotateCcw },
  { value: "dormant", label: "Mark dormant", icon: Clock3 },
  { value: "archived", label: "Archive", icon: Archive },
  { value: "expired", label: "Expire", icon: Trash2 },
];

const CHUNK_SIZE = 25;

const MemoryLifecycleBulkControls = ({ memories, onComplete }) => {
  const [selected, setSelected] = useState(() => new Set());
  const [targetState, setTargetState] = useState("archived");
  const [reason, setReason] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });

  const selectable = useMemo(
    () =>
      memories.map((memory) => ({
        type: memory.type,
        id: memory._id,
        label:
          memory.text ||
          memory.title ||
          memory.summary ||
          `${memory.type} ${memory._id}`,
      })),
    [memories],
  );

  const allSelected =
    selectable.length > 0 && selected.size === selectable.length;

  const toggle = (key) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(
      allSelected
        ? new Set()
        : new Set(selectable.map((item) => `${item.type}:${item.id}`)),
    );
  };

  const runBulkTransition = async () => {
    const items = selectable.filter((item) =>
      selected.has(`${item.type}:${item.id}`),
    );

    if (!items.length) return;

    setRunning(true);
    setProgress({ completed: 0, total: items.length });

    try {
      let completed = 0;

      for (let index = 0; index < items.length; index += CHUNK_SIZE) {
        const chunk = items.slice(index, index + CHUNK_SIZE);

        await knowledgeApi.bulkTransitionLifecycle(
          chunk.map(({ type, id }) => ({ type, id })),
          targetState,
          reason,
        );

        completed += chunk.length;
        setProgress({ completed, total: items.length });
      }

      setSelected(new Set());
      await onComplete?.();
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Bulk lifecycle actions
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Select memories from the current result page and transition them in
            batches of {CHUNK_SIZE}.
          </p>
        </div>
        <button
          type="button"
          onClick={toggleAll}
          disabled={running || selectable.length === 0}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold disabled:opacity-50"
        >
          <Check className="w-3.5 h-3.5" />
          {allSelected ? "Clear selection" : "Select all"}
        </button>
      </div>

      {selectable.length > 0 && (
        <div className="max-h-52 overflow-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
          {selectable.map((item) => {
            const key = `${item.type}:${item.id}`;
            return (
              <label
                key={key}
                className="flex items-center gap-3 px-3 py-2 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <input
                  type="checkbox"
                  checked={selected.has(key)}
                  disabled={running}
                  onChange={() => toggle(key)}
                />
                <span className="font-medium text-slate-700 dark:text-slate-200 truncate">
                  {item.label}
                </span>
                <span className="ml-auto text-slate-400">{item.type}</span>
              </label>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <select
          value={targetState}
          disabled={running}
          onChange={(event) => setTargetState(event.target.value)}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
        >
          {TARGETS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <input
          value={reason}
          disabled={running}
          onChange={(event) => setReason(event.target.value)}
          maxLength={500}
          placeholder="Optional transition reason"
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
        />

        <button
          type="button"
          onClick={runBulkTransition}
          disabled={running || selected.size === 0}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-2 text-xs font-semibold disabled:opacity-50"
        >
          {running ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {progress.completed}/{progress.total} processed
            </>
          ) : (
            `Apply to ${selected.size} selected`
          )}
        </button>
      </div>

      {running && progress.total > 0 && (
        <div
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax={progress.total}
          aria-valuenow={progress.completed}
          className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
        >
          <div
            className="h-full bg-indigo-600 transition-all"
            style={{
              width: `${Math.round((progress.completed / progress.total) * 100)}%`,
            }}
          />
        </div>
      )}
    </section>
  );
};

export default MemoryLifecycleBulkControls;
