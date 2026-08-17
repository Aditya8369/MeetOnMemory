import React from "react";

const TimelineFilters = ({ filters, onToggle }) => {
  const filterOptions = [
    { key: "speaker_change", label: "Speaker Changes", color: "bg-blue-500" },
    { key: "key_moment", label: "Key Moments", color: "bg-purple-500" },
    {
      key: "sentiment_shift",
      label: "Sentiment Shifts",
      color: "bg-green-500",
    },
    { key: "annotation", label: "Annotations", color: "bg-yellow-500" },
    { key: "action_item", label: "Action Items", color: "bg-red-500" },
  ];

  return (
    <div className="flex flex-wrap gap-4 mb-4">
      {filterOptions.map(({ key, label, color }) => (
        <label key={key} className="flex items-center cursor-pointer gap-2">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            checked={filters[key]}
            onChange={() => onToggle(key)}
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
            <span className={`w-3 h-3 rounded-full ${color}`}></span>
            {label}
          </span>
        </label>
      ))}
    </div>
  );
};

export default TimelineFilters;
