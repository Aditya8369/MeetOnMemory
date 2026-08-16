import React, { useState } from "react";
import { useMeetingDuplicates } from "../../hooks/useMeetingDuplicates";
import { format } from "date-fns";

const DuplicateDetectionPanel = ({ meetingId }) => {
  const {
    duplicates,
    isLoading,
    isError,
    mergeMeetings,
    isMerging,
    dismissDuplicate,
    isDismissing,
  } = useMeetingDuplicates(meetingId);

  const [selectedSecondary, setSelectedSecondary] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  if (isLoading || isError || !duplicates || duplicates.length === 0) {
    return null;
  }

  const handleMergeClick = (duplicate) => {
    setSelectedSecondary(duplicate);
    setShowConfirm(true);
  };

  const confirmMerge = async () => {
    if (!selectedSecondary) return;
    try {
      await mergeMeetings({
        primaryId: meetingId,
        secondaryId: selectedSecondary._id,
      });
      setShowConfirm(false);
      setSelectedSecondary(null);
    } catch {
      // Error handled by hook
    }
  };

  const handleDismiss = async (secondaryId) => {
    try {
      await dismissDuplicate({
        primaryId: meetingId,
        secondaryId,
      });
    } catch {
      // Error handled by hook
    }
  };

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-yellow-400"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Potential Duplicate Meetings Detected
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <ul role="list" className="space-y-3">
              {duplicates.map((dup) => (
                <li
                  key={dup._id}
                  className="bg-white bg-opacity-50 p-3 rounded flex justify-between items-center"
                >
                  <div>
                    <div className="font-medium">{dup.title}</div>
                    <div className="text-xs opacity-75">
                      {dup.date
                        ? format(new Date(dup.date), "PPP p")
                        : "Unknown Date"}{" "}
                      • Similarity: {Math.round(dup.similarity * 100)}%
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMergeClick(dup)}
                      disabled={isMerging}
                      className="px-3 py-1 bg-yellow-600 text-white rounded text-xs font-medium hover:bg-yellow-700 disabled:opacity-50 transition-colors"
                    >
                      {isMerging ? "Merging..." : "Merge Data"}
                    </button>
                    <button
                      onClick={() => handleDismiss(dup._id)}
                      disabled={isDismissing}
                      className="px-3 py-1 bg-white text-yellow-800 border border-yellow-300 rounded text-xs font-medium hover:bg-yellow-50 disabled:opacity-50 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {showConfirm && selectedSecondary && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Confirm Merge
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to merge "
              <strong>{selectedSecondary.title}</strong>" into this meeting? The
              secondary meeting's transcript and participants will be appended
              to this one, and the secondary meeting will be archived. This
              action cannot be easily undone.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={confirmMerge}
                disabled={isMerging}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center gap-2 disabled:opacity-50"
              >
                {isMerging ? "Merging..." : "Yes, Merge Meetings"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DuplicateDetectionPanel;
