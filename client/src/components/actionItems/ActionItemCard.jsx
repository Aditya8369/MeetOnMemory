import React from "react";
import GitHubSyncBadge from "./GitHubSyncBadge.jsx";
import JiraSyncBadge from "./JiraSyncBadge.jsx";
import LinearSyncBadge from "./LinearSyncBadge.jsx";

/**
 * @desc Individual card component for an action item in the Kanban board.
 * Displays title, assignee, deadline, and quick actions to change status.
 */
const ActionItemCard = ({ item, onStatusChange }) => {
  const priorityColors = {
    low: "text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-300",
    medium: "text-blue-700 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300",
    high: "text-orange-700 bg-orange-100 dark:bg-orange-900/40 dark:text-orange-300",
    urgent: "text-red-700 bg-red-100 dark:bg-red-900/40 dark:text-red-300",
  };

  const isOverdue =
    item.status === "overdue" ||
    (item.deadline &&
      new Date(item.deadline) < new Date() &&
      item.status !== "completed");

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-2">
        <span
          className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${priorityColors[item.priority]}`}
        >
          {item.priority}
        </span>
        {item.aiConfidence < 1 && (
          <span
            className="text-[10px] text-purple-600 dark:text-purple-400 font-medium"
            title="AI Extracted"
          >
            AI ({Math.round(item.aiConfidence * 100)}%)
          </span>
        )}
      </div>

      <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-2 line-clamp-2">
        {item.title}
      </h4>

      {item.description && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
          {item.description}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
        <div className="flex items-center gap-1.5">
          {item.assignee?.avatar ? (
            <img
              src={item.assignee.avatar}
              alt=""
              className="w-5 h-5 rounded-full"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
              {item.assignee?.name?.charAt(0) || "?"}
            </div>
          )}
          <span className="truncate max-w-[80px]">
            {item.assignee?.name || "Unassigned"}
          </span>
        </div>

        {item.deadline && (
          <div
            className={`flex items-center gap-1 ${isOverdue ? "text-red-600 dark:text-red-400 font-bold" : ""}`}
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {new Date(item.deadline).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {/* GitHub Sync Badge */}
        <GitHubSyncBadge
          issueId={item.externalGitHubIssueId}
          issueUrl={item.externalGitHubIssueUrl}
        />
        {/* Jira Sync Badge */}
        <JiraSyncBadge
          issueId={item.externalJiraIssueId}
          issueUrl={item.externalJiraIssueUrl}
        />
        {/* Linear Sync Badge */}
        <LinearSyncBadge
          issueId={item.externalLinearIssueId}
          issueUrl={item.externalLinearIssueUrl}
        />
      </div>

      {/* Quick Actions */}

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-2 border-t border-gray-100 dark:border-gray-700">
        {item.status !== "completed" && (
          <button
            onClick={() => onStatusChange(item._id, "completed")}
            className="flex-1 py-1 text-[10px] font-bold text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
          >
            Complete
          </button>
        )}
        {item.status === "pending" && (
          <button
            onClick={() => onStatusChange(item._id, "in_progress")}
            className="flex-1 py-1 text-[10px] font-bold text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
          >
            Start
          </button>
        )}
      </div>
    </div>
  );
};

export default ActionItemCard;
