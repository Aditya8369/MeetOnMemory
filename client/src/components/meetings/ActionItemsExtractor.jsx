import React from "react";
import { useActionItems } from "../../hooks/useActionItems";

/**
 * @desc Button component to trigger AI extraction of action items from a meeting transcript.
 * Shows loading state and success/error feedback.
 */
const ActionItemsExtractor = ({ meetingId, onExtracted }) => {
  const { isExtracting, extractFromMeeting } = useActionItems();

  const handleExtract = async () => {
    const count = await extractFromMeeting(meetingId);
    if (count > 0 && onExtracted) {
      onExtracted(count);
    }
  };

  return (
    <button
      onClick={handleExtract}
      disabled={isExtracting}
      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm shadow-sm"
    >
      {isExtracting ? (
        <>
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
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
          Extracting...
        </>
      ) : (
        <>
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
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Extract Action Items (AI)
        </>
      )}
    </button>
  );
};

export default ActionItemsExtractor;
