import React from "react";

/**
 * Lets the user switch between Standard, Hybrid, and Federated (Cross-Workspace) retrieval pipelines. (#2010)
 */
const HybridSearchToggle = ({ mode, setMode, weights, setWeights }) => {
  return (
    <div className="w-full flex flex-col items-center gap-3 mt-4">
      <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-full p-1 text-sm border border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setMode("standard")}
          className={`px-4 py-1.5 rounded-full font-medium transition ${
            mode === "standard"
              ? "bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          Standard
        </button>
        <button
          type="button"
          onClick={() => setMode("hybrid")}
          className={`px-4 py-1.5 rounded-full font-medium transition ${
            mode === "hybrid"
              ? "bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
          title="Combines semantic vector search with knowledge-graph traversal across decisions and action items"
        >
          🔀 Hybrid
        </button>
        <button
          type="button"
          onClick={() => setMode("federated")}
          className={`px-4 py-1.5 rounded-full font-medium transition ${
            mode === "federated"
              ? "bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
          title="Searches across all your accessible organization workspaces"
        >
          🌐 Federated
        </button>
      </div>

      {mode === "hybrid" && (
        <div className="w-full max-w-md flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="shrink-0">Semantic</span>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(weights.semanticWeight * 100)}
            onChange={(e) => {
              const semanticWeight = Number(e.target.value) / 100;
              setWeights({
                semanticWeight,
                graphWeight: 1 - semanticWeight,
              });
            }}
            className="flex-1 accent-blue-600"
          />
          <span className="shrink-0">Graph</span>
          <span className="w-20 text-right shrink-0 tabular-nums">
            {Math.round(weights.semanticWeight * 100)}/
            {Math.round(weights.graphWeight * 100)}
          </span>
        </div>
      )}

      {mode === "federated" && (
        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
          🌐 Searching across multi-workspace organization repositories & team
          knowledge bases
        </p>
      )}
    </div>
  );
};

export default HybridSearchToggle;
