import React, { useState } from "react";
import { Archive, Trash2, Download, Tag, X, Check } from "lucide-react";

const BulkActionBar = ({
  selectedCount,
  isProcessing,
  onArchive,
  onDelete,
  onExport,
  onTag,
  onCancel,
}) => {
  const [isTagging, setIsTagging] = useState(false);
  const [tagInput, setTagInput] = useState("");

  if (selectedCount === 0) return null;

  const handleTagSubmit = () => {
    if (tagInput.trim()) {
      const tags = tagInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      onTag(tags);
      setTagInput("");
      setIsTagging(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
      <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-full border border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center gap-6">
        {/* Count Indicator */}
        <div className="flex items-center gap-2">
          <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            {selectedCount}
          </span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Selected
          </span>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isTagging ? (
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-900 rounded-full px-3 py-1">
              <input
                type="text"
                placeholder="tag1, tag2..."
                className="bg-transparent border-none outline-none text-sm w-32 dark:text-white"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTagSubmit();
                  if (e.key === "Escape") setIsTagging(false);
                }}
                autoFocus
              />
              <button
                onClick={handleTagSubmit}
                disabled={isProcessing || !tagInput.trim()}
                className="text-green-600 hover:text-green-700 p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsTagging(false)}
                className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsTagging(true)}
              disabled={isProcessing}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
              title="Add Tags"
            >
              <Tag className="w-4 h-4" />
              <span className="hidden sm:inline">Tag</span>
            </button>
          )}

          <button
            onClick={() => onExport("md")}
            disabled={isProcessing}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-green-600 hover:bg-green-50 dark:text-gray-300 dark:hover:text-green-400 dark:hover:bg-green-900/30 rounded-lg transition-colors disabled:opacity-50"
            title="Export as ZIP"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            onClick={onArchive}
            disabled={isProcessing}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-amber-600 hover:bg-amber-50 dark:text-gray-300 dark:hover:text-amber-400 dark:hover:bg-amber-900/30 rounded-lg transition-colors disabled:opacity-50"
            title="Archive"
          >
            <Archive className="w-4 h-4" />
            <span className="hidden sm:inline">Archive</span>
          </button>

          <button
            onClick={onDelete}
            disabled={isProcessing}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

        {/* Cancel */}
        <button
          onClick={onCancel}
          className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 rounded-full transition-colors"
          title="Cancel Selection"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default BulkActionBar;
