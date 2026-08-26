import React from "react";
import {
  Filter,
  Star,
  Bookmark,
  Tag,
  Briefcase,
  Users,
  X,
  Pin,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { savedFilterApi } from "../../services";
import { toast } from "react-toastify";

const ICONS = {
  Filter,
  Star,
  Bookmark,
  Tag,
  Briefcase,
  Users,
};

export default function SavedFilterBar({
  savedFilters = [],
  error = null,
  onApplyFilter,
  fetchFilters,
  onRetry,
}) {
  if (error) {
    return (
      <div
        className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 mb-6 shadow-xs"
        role="alert"
        data-testid="saved-filter-bar-error"
      >
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span className="font-medium">{error}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-red-700 dark:text-red-300 hover:underline cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        )}
      </div>
    );
  }

  if (!savedFilters || savedFilters.length === 0) {
    return null;
  }

  const pinnedFilters = savedFilters.filter((f) => f.isPinned);

  if (pinnedFilters.length === 0) {
    return (
      <div className="flex items-center gap-2 mb-6 text-xs text-slate-500 dark:text-slate-400">
        <Pin className="w-3.5 h-3.5" />
        <span>
          {savedFilters.length} saved view(s) available. Pin a view to access it
          directly here.
        </span>
      </div>
    );
  }

  const handleTogglePin = async (e, filter) => {
    e.stopPropagation();
    try {
      await savedFilterApi.togglePin(filter._id, false);
      toast.success("Filter unpinned");
      fetchFilters();
    } catch {
      toast.error("Failed to unpin filter");
    }
  };

  return (
    <div className="flex flex-wrap gap-3 mb-6 items-center">
      <span className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
        <Pin className="w-4 h-4" /> Pinned Views:
      </span>
      {pinnedFilters.map((filter) => {
        const IconComponent = ICONS[filter.icon] || Filter;
        return (
          <button
            key={filter._id}
            onClick={() => onApplyFilter(filter)}
            className="group flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs cursor-pointer relative"
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: filter.color || "#3B82F6" }}
            />
            <IconComponent className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {filter.name}
            </span>
            <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-400">
              {filter.matchCount || 0}
            </span>
            <div
              onClick={(e) => handleTogglePin(e, filter)}
              className="hidden group-hover:flex items-center justify-center w-5 h-5 bg-white dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 ml-1"
              title="Unpin View"
            >
              <X className="w-3.5 h-3.5" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
