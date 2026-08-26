import React from "react";
import { useMeetingContributions } from "../../hooks/useParticipantContributions";

const ContributionSummaryPanel = ({ meetingId }) => {
  const { data, isLoading, isError } = useMeetingContributions(meetingId);

  if (isLoading)
    return (
      <div className="animate-pulse bg-gray-200 h-24 rounded-lg w-full"></div>
    );
  if (isError)
    return (
      <div className="text-red-500 text-sm">
        Failed to load contribution summary.
      </div>
    );

  const contributions = data?.contributions || [];
  const equityScore = data?.equityScore || 0;

  if (contributions.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm border text-sm text-gray-500 text-center">
        Contribution data is not yet calculated for this meeting.
      </div>
    );
  }

  // Get top 3 contributors
  const topContributors = [...contributions]
    .sort((a, b) => b.overallImpact - a.overallImpact)
    .slice(0, 3);

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <h3 className="font-medium text-gray-900 mb-3 flex items-center justify-between">
        Contribution Summary
        <span
          className={`text-xs px-2 py-1 rounded-full ${equityScore > 70 ? "bg-green-100 text-green-800" : equityScore > 40 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}
        >
          Equity: {equityScore}
        </span>
      </h3>

      <div className="space-y-3">
        {topContributors.map((c, i) => (
          <div
            key={c.participantId}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center space-x-2">
              <span className="text-gray-400 font-mono w-4">{i + 1}.</span>
              <span
                className="font-medium text-gray-700 truncate max-w-[120px]"
                title={c.participantName}
              >
                {c.participantName}
              </span>
            </div>
            <div className="flex items-center space-x-3 text-xs text-gray-500">
              <span title="Overall Impact Score" className="font-semibold">
                {c.overallImpact}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t text-center">
        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
          View Detailed Profile &rarr;
        </button>
      </div>
    </div>
  );
};

export default ContributionSummaryPanel;
