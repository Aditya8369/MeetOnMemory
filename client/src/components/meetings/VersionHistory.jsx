import React, { useState, useEffect, useCallback } from "react";
import apiClient from "../../services/apiClient";

/**
 * @desc Sidebar component displaying the version history (snapshots) of the meeting note.
 * Allows users to view past versions and manually trigger new snapshots.
 */
const VersionHistory = ({ meetingId, onSaveSnapshot }) => {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data } = await apiClient.get(`/api/notes/${meetingId}/history`);
      setHistory(data.data || []);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setIsLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    if (meetingId) fetchHistory();
  }, [fetchHistory, meetingId]);

  const handleSaveSnapshot = async () => {
    const title = prompt("Enter a title for this snapshot (optional):");
    if (title === null) return; // User cancelled

    setIsSaving(true);
    try {
      const response = await onSaveSnapshot(title || "Manual Snapshot");
      if (response.success) {
        await fetchHistory(); // Refresh list
      } else {
        alert("Failed to save snapshot: " + response.error);
      }
    } catch (error) {
      console.error("Error saving snapshot:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wider">
          Version History
        </h3>
        <button
          onClick={handleSaveSnapshot}
          disabled={isSaving}
          className="p-1.5 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50"
          title="Save current version"
        >
          {isSaving ? (
            <svg
              className="animate-spin w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {isLoading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
              ></div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
            No previous versions saved yet.
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((snapshot) => (
              <button
                key={snapshot._id}
                className="w-full text-left p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors group border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    v{snapshot.version}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                    {formatDate(snapshot.createdAt)}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {snapshot.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  by {snapshot.createdBy?.name || "Unknown"}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VersionHistory;
