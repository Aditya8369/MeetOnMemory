import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { knowledgeApi } from "../services";
import { toast } from "react-toastify";
import {
  History,
  Loader2,
  RefreshCw,
  Search,
  Archive,
  RotateCcw,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Calendar,
  X,
  ChevronDown,
} from "lucide-react";

const LIFECYCLE_STATES = [
  { value: "all", label: "All Memories" },
  { value: "active", label: "Active" },
  { value: "dormant", label: "Dormant" },
  { value: "archived", label: "Archived" },
  { value: "expired", label: "Expired" },
];

const MEMORY_TYPES = [
  { value: "all", label: "All Types" },
  { value: "decision", label: "Decisions" },
  { value: "action-item", label: "Action Items" },
];

const ITEMS_PER_PAGE = 20; // Server-side pagination limit to optimize large dataset loading

const MemoryLifecycle = () => {
  const navigate = useNavigate();
  const [selectedState, setSelectedState] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination State
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [loading, setLoading] = useState(true);
  const [sweeping, setSweeping] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [memories, setMemories] = useState([]);

  // Transition Modal State
  const [transitionModal, setTransitionModal] = useState({
    isOpen: false,
    memory: null,
    targetState: "",
    reason: "",
  });

  // History Modal State
  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    memory: null,
  });

  const loadMemories = useCallback(async (reset = false) => {
    const currentPage = reset ? 1 : page;

    if (reset) {
      setLoading(true);
      setMemories([]);
      setPage(1);
    } else {
      setLoading(false); // Keep existing data visible while fetching more
    }

    try {
      let decisionList = [];
      let actionList = [];

      const opts = {
        includeArchived: true,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        ...(selectedState !== "all" ? { lifecycleState: selectedState } : {}),
        ...(searchQuery ? { search: searchQuery } : {}),
      };

      if (selectedType === "all" || selectedType === "decision") {
        const dRes = await knowledgeApi.getDecisions("createdAt", null, opts);
        if (dRes.data?.success) {
          decisionList = (dRes.data.decisions || []).map((d) => ({
            ...d,
            type: "decision",
          }));
        }
      }

      if (selectedType === "all" || selectedType === "action-item") {
        const aRes = await knowledgeApi.getActionItems("all", "createdAt", opts);
        if (aRes.data?.success) {
          actionList = (aRes.data.actionItems || []).map((a) => ({
            ...a,
            type: "action-item",
          }));
        }
      }

      const combined = [...decisionList, ...actionList].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      // Check if we received fewer items than the limit, indicating no more pages
      if (combined.length < ITEMS_PER_PAGE) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      setMemories((prev) => (reset ? combined : [...prev, ...combined]));
    } catch (err) {
      console.error("Failed to load memories:", err);
      toast.error("Failed to load knowledge lifecycle items.");
    } finally {
      setLoading(false);
    }
  }, [selectedState, selectedType, searchQuery, page]);

  // Debounced effect for filter changes (resets pagination)
  useEffect(() => {
    const timer = setTimeout(() => {
      loadMemories(true);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedState, selectedType, searchQuery]);

  // Keyboard accessibility for modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setTransitionModal((prev) => ({ ...prev, isOpen: false }));
        setHistoryModal((prev) => ({ ...prev, isOpen: false }));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
  };

  useEffect(() => {
    if (page > 1) {
      loadMemories(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleRunSweep = async () => {
    setSweeping(true);
    try {
      const res = await knowledgeApi.runLifecycleSweep();
      if (res.data?.success) {
        toast.success(res.data.message || "Lifecycle sweep completed successfully.");
        loadMemories(true);
      } else {
        toast.error(res.data?.message || "Failed to run lifecycle sweep.");
      }
    } catch (err) {
      console.error("Sweep error:", err);
      toast.error(err.response?.data?.message || "Failed to trigger lifecycle sweep.");
    } finally {
      setSweeping(false);
    }
  };

  const openTransitionModal = (memory, targetState) => {
    setTransitionModal({
      isOpen: true,
      memory,
      targetState,
      reason: `Transitioning to ${targetState}`,
    });
  };

  const confirmTransition = async () => {
    const { memory, targetState, reason } = transitionModal;
    if (!memory || !targetState) return;

    setUpdatingId(memory._id);
    setTransitionModal({ isOpen: false, memory: null, targetState: "", reason: "" });

    try {
      const res = await knowledgeApi.updateMemoryLifecycleState(
        memory.type,
        memory._id,
        targetState,
        reason
      );

      if (res.data?.success) {
        toast.success(`Memory transitioned to ${targetState}.`);
        loadMemories(true); // Reset pagination on state change
      } else {
        toast.error(res.data?.message || "Failed to update lifecycle state.");
      }
    } catch (err) {
      console.error("Update state error:", err);
      toast.error(err.response?.data?.message || "Failed to update memory state.");
    } finally {
      setUpdatingId(null);
    }
  };

  const getStateBadge = (state) => {
    switch (state) {
      case "active":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold"><Sparkles className="w-3 h-3" /> Active</span>;
      case "dormant":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-semibold"><Clock className="w-3 h-3" /> Dormant</span>;
      case "archived":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"><Archive className="w-3 h-3" /> Archived</span>;
      case "expired":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-semibold"><AlertCircle className="w-3 h-3" /> Expired</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold">{state || "active"}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <History className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              Memory Lifecycle Management
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Monitor, archive, restore, and manage organizational knowledge retention states.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/knowledge/archive")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/60 shadow-sm cursor-pointer transition-colors"
            >
              <Archive className="w-4 h-4" />
              Archive Browser
            </button>
            <button
              onClick={handleRunSweep}
              disabled={sweeping}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer transition-colors"
            >
              {sweeping ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Run Lifecycle Sweep
            </button>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 mb-6 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex flex-wrap gap-2 flex-1">
              {LIFECYCLE_STATES.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setSelectedState(tab.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${selectedState === tab.value
                      ? "bg-indigo-600 text-white shadow-md"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
              >
                {MEMORY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>

              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search memories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content List */}
        <div className="space-y-4">
          {loading && page === 1 && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-600" />
              <p className="text-sm font-medium">Loading memories...</p>
            </div>
          )}

          {!loading && memories.length === 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No memories found</h3>
              <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                No knowledge records match the selected state or filter criteria. Try selecting another state tab or adjusting your search.
              </p>
            </div>
          )}

          {!loading && memories.length > 0 && (
            <div className="grid gap-4">
              {memories.map((mem) => {
                const currentState = mem.lifecycleState || "active";
                return (
                  <div key={mem._id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {getStateBadge(currentState)}
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">
                            {mem.type === "decision" ? "Decision" : "Action Item"}
                          </span>
                          {mem.importanceScore !== undefined && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-semibold">
                              Score: <strong>{mem.importanceScore}</strong>
                            </span>
                          )}
                        </div>

                        <p className="text-slate-900 dark:text-white font-medium leading-relaxed">
                          {mem.text}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                          {mem.sourceMeetingId?.title && (
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              Meeting: {mem.sourceMeetingId.title}
                            </span>
                          )}
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            Created: {new Date(mem.createdAt).toLocaleDateString()}
                          </span>
                          {mem.lastAccessedAt && (
                            <span className="flex items-center gap-1.5">
                              <History className="w-3.5 h-3.5" />
                              Last accessed: {new Date(mem.lastAccessedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 md:items-start">
                        {currentState !== "active" && (
                          <button
                            onClick={() => openTransitionModal(mem, "active")}
                            disabled={updatingId === mem._id}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shadow-sm transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Restore
                          </button>
                        )}
                        {currentState === "active" && (
                          <button
                            onClick={() => openTransitionModal(mem, "archived")}
                            disabled={updatingId === mem._id}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 cursor-pointer shadow-sm transition-colors"
                          >
                            <Archive className="w-3.5 h-3.5" />
                            Archive
                          </button>
                        )}
                        {currentState === "active" && (
                          <button
                            onClick={() => openTransitionModal(mem, "dormant")}
                            disabled={updatingId === mem._id}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer transition-colors"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            Dormant
                          </button>
                        )}
                        <button
                          onClick={() => setHistoryModal({ isOpen: true, memory: mem })}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                        >
                          <History className="w-3.5 h-3.5" />
                          History
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More Button for Pagination */}
          {!loading && hasMore && memories.length > 0 && (
            <div className="flex justify-center pt-6">
              <button
                onClick={handleLoadMore}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors shadow-sm"
              >
                <ChevronDown className="w-4 h-4" />
                Load More Memories
              </button>
            </div>
          )}
        </div>

        {/* Transition Confirmation Modal */}
        {transitionModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {transitionModal.targetState === "active" ? "Restore Memory" : `Change State to ${transitionModal.targetState}`}
                </h3>
                <button
                  onClick={() => setTransitionModal({ isOpen: false, memory: null, targetState: "", reason: "" })}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-400">
                Are you sure you want to transition this memory to <strong>{transitionModal.targetState}</strong>?
              </p>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-700 dark:text-slate-300 italic line-clamp-3">
                  "{transitionModal.memory?.text}"
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Reason / Note (optional)</label>
                <textarea
                  value={transitionModal.reason}
                  onChange={(e) => setTransitionModal((prev) => ({ ...prev, reason: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                  placeholder="Why is this state changing?"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setTransitionModal({ isOpen: false, memory: null, targetState: "", reason: "" })}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmTransition}
                  disabled={updatingId === transitionModal.memory?._id}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 cursor-pointer shadow-sm transition-colors flex items-center gap-2"
                >
                  {updatingId === transitionModal.memory?._id && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm State Change
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History Timeline Modal */}
        {historyModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  Lifecycle Audit History
                </h3>
                <button
                  onClick={() => setHistoryModal({ isOpen: false, memory: null })}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-700 dark:text-slate-300 font-medium line-clamp-2">
                  Memory: "{historyModal.memory?.text}"
                </p>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {(historyModal.memory?.lifecycleHistory || []).length === 0 ? (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                    No previous transition records for this memory.
                  </div>
                ) : (
                  historyModal.memory.lifecycleHistory.map((h, idx) => (
                    <div key={idx} className="relative pl-6 pb-4 border-l-2 border-slate-200 dark:border-slate-700 last:border-0 last:pb-0">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-600 border-2 border-white dark:border-slate-900"></div>
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {h.fromState || "active"} → <strong className="text-indigo-600 dark:text-indigo-400">{h.toState}</strong>
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(h.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {h.reason && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 italic">
                            Reason: {h.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setHistoryModal({ isOpen: false, memory: null })}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default MemoryLifecycle;
