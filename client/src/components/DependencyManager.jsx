import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { actionItemDependencyApi, knowledgeApi } from "../services";
import { toast } from "react-toastify";
import {
  AlertTriangle,
  Plus,
  X,
  Search,
  Loader2,
  GitCommit,
  ShieldAlert,
} from "lucide-react";
import { STATUS_STYLES } from "../utils/taskStyles";

const DependencyManager = ({ task }) => {
  const taskId = task?.id || task?._id;

  const [dependencies, setDependencies] = useState({
    blockers: [],
    blocking: [],
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDependencies = useCallback(async () => {
    if (!taskId) return;
    try {
      setLoading(true);
      const res = await actionItemDependencyApi.getDependencies(taskId);
      if (res.data?.success) {
        setDependencies({
          blockers: res.data.data?.blockers || [],
          blocking: res.data.data?.blocking || [],
        });
      }
    } catch (error) {
      console.error("Failed to load dependencies", error);
      toast.error("Failed to load dependencies");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (taskId) {
      fetchDependencies();
    }
  }, [taskId, fetchDependencies]);

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    let isMounted = true;
    const searchTasks = async () => {
      try {
        setIsSearching(true);
        const res = await knowledgeApi.getActionItems("all", "createdAt", {
          search: searchQuery.trim(),
        });
        if (isMounted && res.data?.success) {
          const existingBlockerIds = new Set(
            dependencies.blockers.map((b) => (b._id || b.id)?.toString()),
          );
          const items = (res.data.actionItems || []).filter((item) => {
            const currentCandidateId = (item._id || item.id)?.toString();
            return (
              currentCandidateId !== taskId?.toString() &&
              !existingBlockerIds.has(currentCandidateId)
            );
          });
          setSearchResults(items.slice(0, 5));
        }
      } catch (err) {
        console.error("Failed to search tasks", err);
      } finally {
        if (isMounted) {
          setIsSearching(false);
        }
      }
    };

    const debounce = setTimeout(searchTasks, 300);
    return () => {
      isMounted = false;
      clearTimeout(debounce);
    };
  }, [searchQuery, taskId, dependencies.blockers]);

  const handleAddBlocker = async (blockerId) => {
    if (!taskId || !blockerId || isSubmitting) return;
    try {
      setIsSubmitting(true);
      setActionError(null);
      await actionItemDependencyApi.addDependency(taskId, blockerId);
      toast.success("Dependency added");
      setSearchQuery("");
      setShowAddMenu(false);
      await fetchDependencies();
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to add dependency";
      setActionError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveDependency = async (targetId, isBlocker) => {
    if (!taskId || !targetId || isSubmitting) return;
    try {
      setIsSubmitting(true);
      setActionError(null);
      if (isBlocker) {
        await actionItemDependencyApi.removeDependency(taskId, targetId);
      } else {
        await actionItemDependencyApi.removeDependency(targetId, taskId);
      }
      toast.success("Dependency removed");
      await fetchDependencies();
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to remove dependency";
      setActionError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!taskId) {
    return null;
  }

  const hasActiveBlockers = dependencies.blockers.some(
    (b) => b.status === "open" || b.status === "in-progress",
  );

  return (
    <div
      className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-6"
      data-testid="dependency-manager"
    >
      <div className="flex items-center gap-2 mb-4">
        <GitCommit className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Dependencies
        </h3>
      </div>

      {actionError && (
        <div
          role="alert"
          className="mb-4 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl flex items-start justify-between gap-3 text-sm text-red-800 dark:text-red-300 animate-in fade-in duration-150"
        >
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Dependency Error</span>
              <span>{actionError}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="p-1 text-red-500 hover:text-red-700 dark:hover:text-red-200 rounded transition-colors cursor-pointer"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {hasActiveBlockers && (
        <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl flex gap-3 items-start">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-900 dark:text-amber-200 text-sm">
              Task is Blocked
            </h4>
            <p className="text-amber-700 dark:text-amber-300 text-sm mt-1">
              This task cannot be completed until its active blockers are
              resolved.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div
          className="flex justify-center py-6"
          data-testid="dependency-loading"
        >
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Blocked By Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Blocked By (Blockers)
              </h4>
              <button
                type="button"
                onClick={() => {
                  setShowAddMenu(!showAddMenu);
                  setActionError(null);
                }}
                className="flex items-center gap-1 text-xs font-medium px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                aria-label={
                  showAddMenu ? "Cancel adding blocker" : "Add Blocker"
                }
                title={showAddMenu ? "Cancel" : "Add Blocker"}
              >
                {showAddMenu ? (
                  <>
                    <X className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Blocker</span>
                  </>
                )}
              </button>
            </div>

            {showAddMenu && (
              <div className="mb-4 relative animate-in fade-in duration-150">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for a task to block this one..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                    aria-label="Search tasks to add as blocker"
                  />
                </div>
                {searchQuery.trim().length >= 2 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                    {isSearching ? (
                      <div className="p-3 text-center text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span>Searching tasks...</span>
                      </div>
                    ) : searchResults.length > 0 ? (
                      <ul role="listbox" aria-label="Search results">
                        {searchResults.map((result) => (
                          <li
                            key={result._id || result.id}
                            role="option"
                            aria-selected="false"
                            onClick={() =>
                              handleAddBlocker(result._id || result.id)
                            }
                            className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer border-b border-slate-100 dark:border-slate-700/50 last:border-0 transition-colors"
                          >
                            <div className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-1">
                              {result.text || result.title}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Owner: {result.owner || "Unassigned"} • Status:{" "}
                              {result.status || "open"}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-3 text-center text-sm text-slate-500 dark:text-slate-400">
                        No matching tasks found
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {dependencies.blockers.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                No active blockers.
              </p>
            ) : (
              <div className="space-y-2">
                {dependencies.blockers.map((blocker) => {
                  const blockerId = blocker._id || blocker.id;
                  const sStyle =
                    STATUS_STYLES[blocker.status] || STATUS_STYLES.open;
                  const Icon = sStyle?.icon;
                  return (
                    <div
                      key={blockerId || blocker.dependencyId}
                      className="flex items-start justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <div className="min-w-0 pr-4 flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {blocker.text || blocker.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${sStyle.bgColor} ${sStyle.textColor} ${sStyle.borderColor}`}
                          >
                            {Icon && <Icon className="w-3 h-3" />}
                            {sStyle.label || blocker.status}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {blocker.owner || "Unassigned"}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDependency(blockerId, true)}
                        disabled={isSubmitting}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors cursor-pointer disabled:opacity-50"
                        aria-label={`Remove blocker ${blocker.text || blocker.title}`}
                        title="Remove blocker"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Blocking Section (Dependents) */}
          {dependencies.blocking.length > 0 && (
            <div>
              <h4 className="font-medium text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Blocks (Dependents)
              </h4>
              <div className="space-y-2">
                {dependencies.blocking.map((dependent) => {
                  const dependentId = dependent._id || dependent.id;
                  const sStyle =
                    STATUS_STYLES[dependent.status] || STATUS_STYLES.open;
                  const Icon = sStyle?.icon;
                  return (
                    <div
                      key={dependentId || dependent.dependencyId}
                      className="flex items-start justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <div className="min-w-0 pr-4 flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {dependent.text || dependent.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${sStyle.bgColor} ${sStyle.textColor} ${sStyle.borderColor}`}
                          >
                            {Icon && <Icon className="w-3 h-3" />}
                            {sStyle.label || dependent.status}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {dependent.owner || "Unassigned"}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveDependency(dependentId, false)
                        }
                        disabled={isSubmitting}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors cursor-pointer disabled:opacity-50"
                        aria-label={`Remove dependent ${dependent.text || dependent.title}`}
                        title="Remove dependency"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

DependencyManager.propTypes = {
  task: PropTypes.shape({
    id: PropTypes.string,
    _id: PropTypes.string,
    title: PropTypes.string,
    text: PropTypes.string,
    status: PropTypes.string,
  }),
};

export default DependencyManager;
