import React, { useCallback, useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import { knowledgeApi } from "../services";
import { toast } from "react-toastify";
import {
  Archive,
  Calendar,
  CheckSquare,
  Clock,
  FileText,
  Filter,
  History,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Tag,
  X,
} from "lucide-react";

const TYPE_OPTIONS = [
  { value: "all", label: "All Memory Types" },
  { value: "decision", label: "Decisions" },
  { value: "action-item", label: "Action Items" },
];

const KnowledgeArchive = () => {
  const [selectedType, setSelectedType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");
  const [loading, setLoading] = useState(true);
  const [archivedMemories, setArchivedMemories] = useState([]);
  const [tagFacets, setTagFacets] = useState([]);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkRestoring, setBulkRestoring] = useState(false);
  const [bulkSummary, setBulkSummary] = useState(null);

  const [restoringId, setRestoringId] = useState(null);
  const [restoreModal, setRestoreModal] = useState({
    isOpen: false,
    memory: null,
    reason: "",
  });

  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    memory: null,
  });

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const loadArchivedMemories = useCallback(async () => {
    setLoading(true);

    try {
      const res = await knowledgeApi.getArchivedMemories({
        type: selectedType,
        search: searchQuery || undefined,
        tag: selectedTag,
        page,
        limit,
      });

      if (!res.data?.success) {
        throw new Error(
          res.data?.message || "Failed to fetch archived knowledge items.",
        );
      }

      setArchivedMemories(res.data.memories || []);
      setTotalCount(res.data.pagination?.total || 0);
      setTotalPages(Math.max(1, res.data.pagination?.totalPages || 1));
      setTagFacets(res.data.facets?.tags || []);
      setSelectedIds(new Set());
      setBulkSummary(null);
    } catch (err) {
      console.error("Failed to load archived memories:", err);
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to fetch archived knowledge items.",
      );
      setArchivedMemories([]);
      setTotalCount(0);
      setTotalPages(1);
      setTagFacets([]);
      setSelectedIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [selectedType, searchQuery, selectedTag, page, limit]);

  useEffect(() => {
    const timer = setTimeout(loadArchivedMemories, 300);
    return () => clearTimeout(timer);
  }, [loadArchivedMemories]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setRestoreModal((prev) => ({ ...prev, isOpen: false }));
      setHistoryModal((prev) => ({ ...prev, isOpen: false }));
      if (!bulkRestoring) setBulkModalOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [bulkRestoring]);

  const openRestoreModal = (memory) => {
    setRestoreModal({
      isOpen: true,
      memory,
      reason: "Restored from Knowledge Archive Browser",
    });
  };

  const confirmRestore = async () => {
    const { memory, reason } = restoreModal;
    if (!memory) return;

    setRestoringId(memory._id);
    setRestoreModal({ isOpen: false, memory: null, reason: "" });

    try {
      const res = await knowledgeApi.updateMemoryLifecycleState(
        memory.type,
        memory._id,
        "active",
        reason,
      );

      if (!res.data?.success) {
        throw new Error(res.data?.message || "Failed to restore memory.");
      }

      toast.success("Memory successfully restored to Active Knowledge.");
      await loadArchivedMemories();
    } catch (err) {
      console.error("Restore error:", err);
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to restore memory.",
      );
    } finally {
      setRestoringId(null);
    }
  };

  const toggleSelection = (memory) => {
    const key = `${memory.type}:${memory._id}`;
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectedMemories = useMemo(
    () =>
      archivedMemories.filter((memory) =>
        selectedIds.has(`${memory.type}:${memory._id}`),
      ),
    [archivedMemories, selectedIds],
  );

  const allVisibleSelected =
    archivedMemories.length > 0 &&
    archivedMemories.every((memory) =>
      selectedIds.has(`${memory.type}:${memory._id}`),
    );

  const toggleSelectAll = () => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (allVisibleSelected) {
        archivedMemories.forEach((memory) =>
          next.delete(`${memory.type}:${memory._id}`),
        );
      } else {
        archivedMemories.forEach((memory) =>
          next.add(`${memory.type}:${memory._id}`),
        );
      }
      return next;
    });
  };

  const confirmBulkRestore = async () => {
    if (selectedMemories.length === 0) return;

    setBulkRestoring(true);
    setBulkSummary(null);

    try {
      const items = selectedMemories.map(({ type, _id }) => ({
        type,
        id: _id,
      }));

      const res = await knowledgeApi.bulkRestoreArchivedMemories(
        items,
        "Bulk restored from Knowledge Archive Browser",
      );

      if (!res.data?.success) {
        throw new Error(res.data?.message || "Bulk restore failed.");
      }

      const summary = res.data;
      setBulkSummary(summary);

      if (summary.failed === 0) {
        toast.success(`Restored ${summary.restored} archived memories.`);
      } else {
        toast.warning(
          `Restored ${summary.restored} of ${summary.total}. ${summary.failed} item(s) failed.`,
        );
      }

      setBulkModalOpen(false);
      await loadArchivedMemories();
    } catch (err) {
      console.error("Bulk restore error:", err);
      toast.error(
        err.response?.data?.message || err.message || "Bulk restore failed.",
      );
    } finally {
      setBulkRestoring(false);
    }
  };

  const resetFilters = () => {
    setSelectedType("all");
    setSearchQuery("");
    setSelectedTag("all");
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-800 dark:text-slate-200 pt-20">
      <Navbar />

      <main className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400">
                <Archive className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Knowledge Archive Browser
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Search, review, select, and restore archived organizational
                  memory items.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {selectedMemories.length > 0 && (
              <button
                type="button"
                onClick={() => setBulkModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 shadow-xs cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Restore {selectedMemories.length} selected
              </button>
            )}

            <button
              type="button"
              onClick={loadArchivedMemories}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh Archive
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search archived decisions, action items, or keywords..."
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedType}
                onChange={(event) => {
                  setSelectedType(event.target.value);
                  setPage(1);
                  setSelectedTag("all");
                }}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium cursor-pointer"
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-slate-400" />
              <select
                value={selectedTag}
                onChange={(event) => {
                  setSelectedTag(event.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium cursor-pointer"
                aria-label="Filter archive by tag"
              >
                <option value="all">All Topics / Tags</option>
                {tagFacets.map((facet) => (
                  <option key={facet.value} value={facet.value}>
                    {facet.value} ({facet.count})
                  </option>
                ))}
              </select>
            </div>

            {(searchQuery ||
              selectedType !== "all" ||
              selectedTag !== "all") && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Clear filters
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs">
            <label className="inline-flex items-center gap-2 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleSelectAll}
                disabled={loading || archivedMemories.length === 0}
                className="h-4 w-4 rounded border-slate-300"
              />
              Select all on this page
            </label>

            <span className="text-slate-500 dark:text-slate-400">
              {selectedMemories.length} selected · {totalCount} total archived
              items
            </span>
          </div>
        </div>

        {bulkSummary && (
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-sm">
            <div className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
              <CheckSquare className="w-4 h-4" />
              Bulk restore completed: {bulkSummary.restored} restored,{" "}
              {bulkSummary.failed} failed.
            </div>
            {bulkSummary.failed > 0 && (
              <div className="mt-2 space-y-1 text-xs text-amber-800 dark:text-amber-300">
                {bulkSummary.results
                  ?.filter((result) => !result.success)
                  .map((result) => (
                    <div key={`${result.type}:${result.id}`}>
                      {result.type || "memory"} {result.id || ""}:{" "}
                      {result.message}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        <div>
          {loading && (
            <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-sm font-medium">
                Loading archived memories...
              </span>
            </div>
          )}

          {!loading && archivedMemories.length === 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-xs">
              <Archive className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                No Archived Memories Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {searchQuery || selectedType !== "all" || selectedTag !== "all"
                  ? "No archived knowledge items match your current search or filter parameters."
                  : "There are currently no archived decisions or action items in your organization's knowledge base."}
              </p>
            </div>
          )}

          {!loading && archivedMemories.length > 0 && (
            <div className="space-y-4">
              {archivedMemories.map((memory) => {
                const key = `${memory.type}:${memory._id}`;
                const checked = selectedIds.has(key);

                return (
                  <div
                    key={key}
                    className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelection(memory)}
                        aria-label={`Select ${memory.type} ${memory._id}`}
                        className="mt-1 h-4 w-4 rounded border-slate-300 shrink-0"
                      />

                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            <Archive className="w-3 h-3" /> Archived
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {memory.type === "decision"
                              ? "Decision"
                              : "Action Item"}
                          </span>
                          {memory.importanceScore !== undefined && (
                            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                              Score:{" "}
                              <strong className="text-slate-800 dark:text-slate-200">
                                {memory.importanceScore}
                              </strong>
                            </span>
                          )}
                        </div>

                        <p className="text-sm font-medium text-slate-900 dark:text-white leading-relaxed">
                          {memory.text}
                        </p>

                        <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                          {memory.sourceMeetingId?.title && (
                            <span className="flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5" />
                              Meeting: {memory.sourceMeetingId.title}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Created:{" "}
                            {new Date(memory.createdAt).toLocaleDateString()}
                          </span>
                          {memory.archivedAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-indigo-500" />
                              Archived:{" "}
                              {new Date(memory.archivedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {(memory.aliases || []).length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(memory.aliases || []).slice(0, 5).map((tag) => (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => {
                                  setSelectedTag(tag);
                                  setPage(1);
                                }}
                                className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 hover:bg-indigo-100 dark:hover:bg-indigo-950 cursor-pointer"
                              >
                                #{tag}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => openRestoreModal(memory)}
                        disabled={restoringId === memory._id || bulkRestoring}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shadow-xs transition-colors"
                      >
                        {restoringId === memory._id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        Restore Memory
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setHistoryModal({ isOpen: true, memory })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                      >
                        <History className="w-3.5 h-3.5" /> Audit History
                      </button>
                    </div>
                  </div>
                );
              })}

              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
                <div className="text-slate-500 dark:text-slate-400 font-medium">
                  Showing page{" "}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {page}
                  </strong>{" "}
                  of{" "}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {totalPages}
                  </strong>{" "}
                  ({totalCount} total archived items)
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 dark:text-slate-400">
                      Per page:
                    </span>
                    <select
                      value={limit}
                      onChange={(event) => {
                        setLimit(Number(event.target.value));
                        setPage(1);
                      }}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 font-medium cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setPage((previous) => Math.max(previous - 1, 1))
                      }
                      disabled={page <= 1 || loading}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPage((previous) =>
                          Math.min(previous + 1, totalPages),
                        )
                      }
                      disabled={page >= totalPages || loading}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
        {bulkRestoring && (
          <div className="pointer-events-auto flex items-center gap-3 rounded-xl bg-slate-900 text-white px-4 py-3 shadow-2xl text-xs">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Restoring {selectedMemories.length} archived memories…</span>
          </div>
        )}
      </div>

      {restoreModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-emerald-600" />
                Restore Archived Memory
              </h3>
              <button
                type="button"
                onClick={() =>
                  setRestoreModal({ isOpen: false, memory: null, reason: "" })
                }
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Close restore dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Restoring this memory will return it to{" "}
              <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">
                Active State
              </strong>
              .
            </p>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 font-medium">
              "{restoreModal.memory?.text}"
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Restoring (optional)
              </label>
              <input
                type="text"
                value={restoreModal.reason}
                onChange={(event) =>
                  setRestoreModal((previous) => ({
                    ...previous,
                    reason: event.target.value,
                  }))
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  setRestoreModal({ isOpen: false, memory: null, reason: "" })
                }
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRestore}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer shadow-xs"
              >
                Confirm Restoration
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={bulkModalOpen}
        onClose={() => {
          if (!bulkRestoring) setBulkModalOpen(false);
        }}
        onConfirm={confirmBulkRestore}
        title="Restore selected archived memories?"
        message={`You are about to restore ${selectedMemories.length} archived ${
          selectedMemories.length === 1 ? "memory" : "memories"
        } to Active Knowledge. Individual failures will be reported without rolling back successful restores.`}
        confirmText={`Restore ${selectedMemories.length}`}
        cancelText="Cancel"
        isLoading={bulkRestoring}
        loadingText={`Restoring ${selectedMemories.length}…`}
        variant="warning"
      />

      {historyModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                Memory Audit Trail
              </h3>
              <button
                type="button"
                onClick={() => setHistoryModal({ isOpen: false, memory: null })}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Close history dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
              Memory: "{historyModal.memory?.text}"
            </p>

            <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
              {(historyModal.memory?.lifecycleHistory || []).length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  No state transition records found.
                </p>
              ) : (
                historyModal.memory.lifecycleHistory.map((history, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold">
                      <span>
                        {history.fromState || history.from || "active"} →{" "}
                        <strong className="text-indigo-600 dark:text-indigo-400 uppercase">
                          {history.toState || history.to}
                        </strong>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {new Date(
                          history.timestamp || history.transitionedAt,
                        ).toLocaleString()}
                      </span>
                    </div>
                    {history.reason && (
                      <p className="text-slate-500 dark:text-slate-400 italic">
                        Reason: {history.reason}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setHistoryModal({ isOpen: false, memory: null })}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="sr-only" aria-live="polite">
        {bulkRestoring
          ? `Restoring ${selectedMemories.length} memories`
          : bulkSummary
            ? `${bulkSummary.restored} restored, ${bulkSummary.failed} failed`
            : ""}
      </div>
    </div>
  );
};

export default KnowledgeArchive;
