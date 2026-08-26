import React from "react";

/**
 * @desc Visual grid displaying ranked time slot proposals.
 * Shows optimality scores, conflict warnings, and allows quick confirmation.
 */
const AvailabilityGrid = ({ proposals, onConfirm, onHandoff, isLoading }) => {
  const safeProposals = Array.isArray(proposals) ? proposals : [];

  if (proposals.length === 0 && !isLoading) {
    return (
      <div className="py-10 text-center text-sm text-gray-600 dark:text-gray-400">
        <p className="text-base font-semibold">No optimal slots found</p>
        <p className="mt-1">
          Try expanding the date range or relaxing preferences.
        </p>
      </div>
    );
  }

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const getScoreColor = (score) => {
    if (score >= 80)
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
    if (score >= 50)
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  };

  return (
    <div className="space-y-4">
      <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">
        Top Recommended Times ({safeProposals.length} found)
      </h3>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {safeProposals.map((slot, index) => (
          <div
            key={index}
            className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-slate-800"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-gray-900 dark:text-white">
                  {formatDate(slot.startTime)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                </p>
              </div>

              <div
                className={`rounded-full px-2 py-1 text-xs font-bold ${getScoreColor(slot.score)}`}
              >
                {slot.score}% Match
              </div>
            </div>

            <div className="mb-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{(slot.attendeeCount ?? 0).toString()} available</span>

              {(slot.conflicts || []).length > 0 && (
                <span className="font-medium text-red-600 dark:text-red-400">
                  {slot.conflicts.length} conflict
                  {slot.conflicts.length > 1 ? "s" : ""}
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onConfirm(slot)}
                disabled={isLoading}
                className="flex-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Confirm Meeting
              </button>
              {onHandoff && (
                <button
                  type="button"
                  onClick={() => onHandoff(slot)}
                  disabled={isLoading}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-slate-700 disabled:opacity-50"
                  title="Customize in full meeting form"
                >
                  Customize
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AvailabilityGrid;
