import React, { useState, useEffect } from "react";
import { actionItemDependencyApi, knowledgeApi } from "../services";
import { toast } from "react-toastify";
import {
  AlertTriangle,
  Plus,
  X,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";

const STATUS_STYLES = {
  open: {
    label: "Open",
    bgColor: "bg-slate-100 dark:bg-slate-800",
    textColor: "text-slate-700 dark:text-slate-300",
    borderColor: "border-slate-200 dark:border-slate-700",
    icon: Clock,
  },
  "in-progress": {
    label: "In Progress",
    bgColor: "bg-blue-50 dark:bg-blue-900/30",
    textColor: "text-blue-700 dark:text-blue-400",
    borderColor: "border-blue-200 dark:border-blue-800",
    icon: Loader2,
  },
  resolved: {
    label: "Resolved",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/30",
    textColor: "text-emerald-700 dark:text-emerald-400",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  superseded: {
    label: "Superseded",
    bgColor: "bg-red-50 dark:bg-red-900/30",
    textColor: "text-red-700 dark:text-red-400",
    borderColor: "border-red-200 dark:border-red-800",
    icon: AlertCircle,
  },
};

const DependencyManager = ({ task }) => {
  const [dependencies, setDependencies] = useState({
    blockers: [],
    blocking: [],
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const fetchDependencies = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await actionItemDependencyApi.getDependencies(task.id);
      if (res.data?.success) {
        setDependencies(res.data.data);
      }
    } catch (error) {
      console.error("Failed to load dependencies", error);
      toast.error("Failed to load dependencies");
    } finally {
      setLoading(false);
    }
  }, [task?.id]);

  useEffect(() => {
    if (task?.id) {
      fetchDependencies();
    }
  }, [task?.id, fetchDependencies]);

  useEffect(() => {
    const searchTasks = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      try {
        setIsSearching(true);
        // Using knowledgeApi which we assume gets action items.
        // In Tasks.jsx it calls `knowledgeApi.getActionItems("all")`
        const res = await knowledgeApi.getActionItems("all");
        if (res.data?.success) {
          const items = res.data.actionItems.filter(
            (item) =>
              item._id !== task.id &&
              item.text.toLowerCase().includes(searchQuery.toLowerCase()),
          );
          setSearchResults(items.slice(0, 5)); // show top 5 matches
        }
      } catch (err) {
        console.error("Failed to search tasks", err);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchTasks, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, task?.id]);

  const handleAddBlocker = async (blockerId) => {
    try {
      await actionItemDependencyApi.addDependency(task.id, blockerId);
      toast.success("Dependency added");
      setSearchQuery("");
      setShowAddMenu(false);
      fetchDependencies();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add dependency");
    }
  };

  const handleRemoveDependency = async (dependencyId, isBlocker) => {
    try {
      if (isBlocker) {
        await actionItemDependencyApi.removeDependency(task.id, dependencyId);
      } else {
        await actionItemDependencyApi.removeDependency(dependencyId, task.id);
      }
      toast.success("Dependency removed");
      fetchDependencies();
    } catch {
      toast.error("Failed to remove dependency");
    }
  };

  const hasActiveBlockers = dependencies.blockers.some(
    (b) => b.status === "open" || b.status === "in-progress",
  );

  return (
    <div className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        Dependencies
      </h3>

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
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Blocked By Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Blocked By (Blockers)
              </h4>
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 transition-colors"
                title="Add Blocker"
              >
                {showAddMenu ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </button>
            </div>

            {showAddMenu && (
              <div className="mb-4 relative">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for a task to block this one..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
                    autoFocus
                  />
                </div>
                {searchQuery.length >= 2 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden">
                    {isSearching ? (
                      <div className="p-3 text-center text-sm text-slate-500">
                        Searching...
                      </div>
                    ) : searchResults.length > 0 ? (
                      <ul>
                        {searchResults.map((result) => (
                          <li
                            key={result._id}
                            onClick={() => handleAddBlocker(result._id)}
                            className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                          >
                            <div className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-1">
                              {result.text}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              Owner: {result.owner || "Unassigned"} • Status:{" "}
                              {result.status}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-3 text-center text-sm text-slate-500">
                        No tasks found
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {dependencies.blockers.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No active blockers.
              </p>
            ) : (
              <div className="space-y-2">
                {dependencies.blockers.map((blocker) => {
                  const sStyle =
                    STATUS_STYLES[blocker.status] || STATUS_STYLES.open;
                  const Icon = sStyle.icon;
                  return (
                    <div
                      key={blocker._id}
                      className="flex items-start justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <div className="min-w-0 pr-4 flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {blocker.text}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${sStyle.bgColor} ${sStyle.textColor} ${sStyle.borderColor}`}
                          >
                            <Icon className="w-3 h-3" />
                            {sStyle.label}
                          </span>
                          <span className="text-xs text-slate-500">
                            {blocker.owner}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          handleRemoveDependency(blocker._id, true)
                        }
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
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

          {/* Blocking Section */}
          {dependencies.blocking.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
                Blocks (Dependents)
              </h4>
              <div className="space-y-2">
                {dependencies.blocking.map((dependent) => {
                  const sStyle =
                    STATUS_STYLES[dependent.status] || STATUS_STYLES.open;
                  const Icon = sStyle.icon;
                  return (
                    <div
                      key={dependent._id}
                      className="flex items-start justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <div className="min-w-0 pr-4 flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {dependent.text}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${sStyle.bgColor} ${sStyle.textColor} ${sStyle.borderColor}`}
                          >
                            <Icon className="w-3 h-3" />
                            {sStyle.label}
                          </span>
                          <span className="text-xs text-slate-500">
                            {dependent.owner}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          handleRemoveDependency(dependent._id, false)
                        }
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
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

export default DependencyManager;
