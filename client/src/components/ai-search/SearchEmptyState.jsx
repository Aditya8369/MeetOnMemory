import React from "react";

const SearchEmptyState = ({ hasSearched, error, onClearFilters }) => {
  if (error) {
    return (
      <div className="text-center py-16 px-4">
        <div className="text-5xl mb-4" aria-hidden="true">
          ⚠️
        </div>
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
          Search failed
        </h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-sm">
          {error}
        </p>
      </div>
    );
  }

  if (hasSearched) {
    return (
      <div className="text-center py-16 px-4">
        <div className="text-5xl mb-4" aria-hidden="true">
          🔍
        </div>
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
          No results found
        </h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-sm">
          We couldn&apos;t find any matches. Try different keywords or clear
          advanced filters.
        </p>
        {onClearFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-4 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            Clear filters
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="text-center py-16 px-4">
      <div className="text-5xl mb-4" aria-hidden="true">
        💬
      </div>
      <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
        Start searching
      </h3>
      <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-sm">
        Type your question above to explore meetings, decisions, and action
        items. Hybrid mode supports date, meeting type, speaker, and tag
        filters. Recent searches appear below once you run a query.
      </p>
    </div>
  );
};

export default SearchEmptyState;
