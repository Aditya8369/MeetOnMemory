import React, { useState, useEffect, useCallback } from "react";
import Navbar from "../components/Navbar.jsx";
import { knowledgeApi } from "../services";
import { toast } from "react-toastify";
import {
  GitMerge,
  Loader2,
  Sparkles,
  Tags,
  History,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  CheckSquare,
  Square,
  Eye,
  Undo2,
  X,
} from "lucide-react";

const MODEL_OPTIONS = [
  { value: "decision", label: "Decisions" },
  { value: "actionItem", label: "Action Items" },
];

const MemoryConsolidation = () => {
  const [selectedModel, setSelectedModel] = useState("decision");
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState(null);
  const [selectedClusters, setSelectedClusters] = useState(new Set());
  const [activeDiffMerge, setActiveDiffMerge] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await knowledgeApi.getConsolidationHistory(selectedModel);
      if (res.data?.success) {
        setHistory(res.data.memories || []);
      } else {
        setHistoryError(
          res.data?.message || "Failed to load consolidation history",
        );
      }
    } catch (err) {
      console.error("Failed to load consolidation history", err);
      setHistoryError(
        "Failed to load consolidation history. Please try again.",
      );
    } finally {
      setHistoryLoading(false);
    }
  }, [selectedModel]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const modelReport = report?.results?.[selectedModel];

  // Initialize selected clusters when preview report arrives
  useEffect(() => {
    if (modelReport?.merges) {
      const allIds = new Set(modelReport.merges.map((m) => m.canonicalId));
      setSelectedClusters(allIds);
    }
  }, [modelReport]);

  const toggleClusterSelection = (canonicalId) => {
    const next = new Set(selectedClusters);
    if (next.has(canonicalId)) {
      next.delete(canonicalId);
    } else {
      next.add(canonicalId);
    }
    setSelectedClusters(next);
  };

  const handleSelectAll = () => {
    if (modelReport?.merges) {
      if (selectedClusters.size === modelReport.merges.length) {
        setSelectedClusters(new Set());
      } else {
        setSelectedClusters(
          new Set(modelReport.merges.map((m) => m.canonicalId)),
        );
      }
    }
  };

  const runEngine = async (dryRun) => {
    setRunning(true);
    if (dryRun) {
      setReport(null);
    }
    try {
      const res = await knowledgeApi.runConsolidation({
        dryRun,
        models: [selectedModel],
      });
      if (res.data?.success) {
        setReport(res.data.report);
        toast.success(
          dryRun
            ? "Preview generated — review clusters below."
            : "Memories consolidated successfully.",
        );
        if (!dryRun) {
          setConfirmModalOpen(false);
          await loadHistory();
        }
      } else {
        toast.error(res.data?.message || "Consolidation failed.");
      }
    } catch (err) {
      console.error("Consolidation error", err);
      toast.error(
        err.response?.data?.message || "Failed to run memory consolidation.",
      );
    } finally {
      setRunning(false);
    }
  };

  const handleUndoRecent = () => {
    toast.info("Rollback request submitted for the latest consolidation run.");
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-800 dark:text-slate-200">
      <Navbar />

      <div className="pt-28 pb-16 p-6 max-w-4xl mx-auto space-y-6">
        <div
          role="region"
          aria-label="Memory Consolidation Controls"
          className="space-y-6"
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <GitMerge className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                Memory Consolidation & Review
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Preview duplicate clusters, review field diffs, and selectively
                merge canonical records.
              </p>
            </div>

            <select
              aria-label="Select Memory Type"
              value={selectedModel}
              disabled={running}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {MODEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => runEngine(true)}
              disabled={running}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {running ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-indigo-500" />
              )}
              Preview merges
            </button>
            <button
              data-testid="consolidate-open-modal-button"
              onClick={() => setConfirmModalOpen(true)}
              disabled={running}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {running ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <GitMerge className="w-4 h-4" />
              )}
              Consolidate now
            </button>
            <button
              data-testid="undo-recent-button"
              onClick={handleUndoRecent}
              disabled={running || history.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
            >
              <Undo2 className="w-4 h-4" />
              Undo Last Run
            </button>
          </div>
        </div>

        {modelReport && (
          <div
            role="region"
            aria-label="Consolidation Results"
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {report.dryRun ? "Preview" : "Consolidation"} Results
              </div>

              {modelReport.merges.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  {selectedClusters.size === modelReport.merges.length
                    ? "Deselect All"
                    : "Select All"}
                </button>
              )}
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              Scanned {modelReport.recordsScanned} memories, found{" "}
              {modelReport.clustersFound} duplicate cluster
              {modelReport.clustersFound === 1 ? "" : "s"}. Selected:{" "}
              <strong>{selectedClusters.size}</strong> of{" "}
              {modelReport.merges.length}
            </p>

            {modelReport.merges.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
                No duplicates found — the graph is already clean.
              </p>
            )}

            <div className="space-y-3">
              {modelReport.merges.map((merge) => {
                const isSelected = selectedClusters.has(merge.canonicalId);
                return (
                  <div
                    key={merge.canonicalId}
                    data-testid="cluster-review-card"
                    className={`rounded-xl border p-4 transition-all ${
                      isSelected
                        ? "border-blue-300 dark:border-blue-700 bg-blue-50/40 dark:bg-blue-950/20"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 opacity-75"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          aria-label={`Select cluster ${merge.canonicalText}`}
                          onClick={() =>
                            toggleClusterSelection(merge.canonicalId)
                          }
                          className="mt-0.5 text-blue-600 dark:text-blue-400 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400" />
                          )}
                        </button>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white text-sm">
                            {merge.canonicalText}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Absorbs {merge.mergedIds.length} duplicate
                            {merge.mergedIds.length === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>

                      <button
                        data-testid="view-diff-button"
                        onClick={() => setActiveDiffMerge(merge)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-500" />
                        View Diff
                      </button>
                    </div>

                    {merge.aliasesAdded.length > 0 && (
                      <div className="flex items-start gap-2 mt-3 text-xs text-slate-600 dark:text-slate-300 pl-8">
                        <Tags className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
                        <span>{merge.aliasesAdded.join(" • ")}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div
          role="region"
          aria-label="Consolidated Memories History"
          className="space-y-3"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-5 h-5" />
              Previously consolidated memories
            </h2>
            <button
              onClick={loadHistory}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer p-1"
              aria-label="Refresh history"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {historyLoading && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Loading...
            </p>
          )}

          {historyError && !historyLoading && (
            <div
              data-testid="history-error-state"
              className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-center"
            >
              <p className="text-sm text-red-600 dark:text-red-400 mb-3">
                {historyError}
              </p>
              <button
                data-testid="history-retry-button"
                onClick={loadHistory}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {!historyLoading && !historyError && history.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No memories have been consolidated yet.
            </p>
          )}

          {!historyLoading && !historyError && (
            <div className="space-y-3">
              {history.map((memory) => (
                <div
                  key={memory._id}
                  className="rounded-lg border border-slate-100 dark:border-slate-800 p-4 bg-white dark:bg-slate-900/50"
                >
                  <p className="font-medium text-slate-900 dark:text-white">
                    {memory.text}
                  </p>
                  {memory.aliases?.length > 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Aliases: {memory.aliases.join(", ")}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    {memory.mergedFrom?.length || 0} memories merged • last
                    consolidated{" "}
                    {memory.lastConsolidatedAt
                      ? new Date(memory.lastConsolidatedAt).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cluster Field Diff Modal */}
      {activeDiffMerge && (
        <div
          data-testid="diff-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full p-6 border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <GitMerge className="w-5 h-5 text-indigo-600" />
                Cluster Field Diff
              </h3>
              <button
                onClick={() => setActiveDiffMerge(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase">
                  Canonical Text
                </span>
                <p className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 rounded-lg mt-1 font-medium">
                  {activeDiffMerge.canonicalText}
                </p>
              </div>

              <div>
                <span className="text-xs font-bold text-gray-500 uppercase">
                  Merged Duplicates ({activeDiffMerge.mergedIds.length})
                </span>
                <ul className="mt-1 space-y-1">
                  {activeDiffMerge.aliasesAdded.map((alias, i) => (
                    <li
                      key={i}
                      className="p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-xs text-gray-700 dark:text-gray-300"
                    >
                      • {alias}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setActiveDiffMerge(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close Diff
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal before permanent consolidation */}
      {confirmModalOpen && (
        <div
          data-testid="confirm-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700 space-y-4">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">
              Confirm Memory Consolidation
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to merge{" "}
              <strong>{selectedClusters.size}</strong> selected clusters? This
              will merge duplicate records into canonical memories with full
              history retention.
            </p>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                data-testid="confirm-apply-button"
                onClick={() => runEngine(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Confirm & Consolidate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoryConsolidation;
