import React from "react";

const IcebreakerWidget = ({
  icebreakers,
  loading,
  onSelect,
  selectedIcebreaker,
}) => {
  if (loading) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
        <p className="text-gray-500 text-sm animate-pulse">
          Generating context-aware icebreakers...
        </p>
      </div>
    );
  }

  if (!icebreakers || icebreakers.length === 0) {
    return null; // or a placeholder if preferred
  }

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm mb-4">
      <h3 className="text-lg font-semibold text-blue-800 mb-2">
        Suggested Icebreakers
      </h3>
      {selectedIcebreaker ? (
        <div className="bg-white p-3 rounded shadow-sm border border-green-200">
          <p className="text-sm font-medium text-green-700 mb-1 capitalize">
            Selected: {selectedIcebreaker.category}
          </p>
          <p className="text-gray-800">{selectedIcebreaker.promptText}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {icebreakers.map((ib, idx) => (
            <li
              key={idx}
              className="bg-white p-3 rounded shadow-sm flex flex-col sm:flex-row justify-between sm:items-center border border-gray-100 hover:border-blue-300 transition-colors"
            >
              <div className="mb-2 sm:mb-0">
                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full uppercase tracking-wide font-bold mr-2">
                  {ib.category}
                </span>
                <span className="text-gray-700 text-sm">{ib.promptText}</span>
              </div>
              <button
                onClick={() => onSelect(ib.category, ib.promptText)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
              >
                Select
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default IcebreakerWidget;
