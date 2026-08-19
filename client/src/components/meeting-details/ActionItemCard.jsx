import React from "react";

const ActionItemCard = ({ actionItem, index }) => {
  const task = typeof actionItem === "string" ? actionItem : actionItem.task;
  const owner = typeof actionItem === "string" ? null : actionItem.owner;
  const dueDate = typeof actionItem === "string" ? null : actionItem.due_date;
  const status = typeof actionItem === "string" ? null : actionItem.status;

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
      case "in progress":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
      case "pending":
      default:
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300";
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors">
      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-semibold">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-700 dark:text-gray-200 text-sm font-medium mb-1">
          {task}
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          {owner && (
            <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400">
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
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              {owner}
            </span>
          )}
          {dueDate && (
            <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400">
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
              {dueDate}
            </span>
          )}
          {status && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full ${getStatusColor(status)}`}
            >
              {status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActionItemCard;
