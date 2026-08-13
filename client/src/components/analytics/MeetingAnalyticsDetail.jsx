import React, { useEffect, useState } from "react";
import api from "../../services/api";

/**
 * @desc Detailed modal showing speaking time distribution, participation balance,
 * and specific metrics for a single meeting.
 */
const MeetingAnalyticsDetail = ({ meetingId, onClose }) => {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const { data } = await api.get(`/analytics/meeting/${meetingId}`);
        setAnalytics(data.data);
      } catch (error) {
        console.error("Failed to fetch detail:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [meetingId]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 w-full max-w-2xl animate-pulse h-96"></div>
      </div>
    );
  }

  if (!analytics) return null;

  // Sort distribution by speaking time descending
  const sortedDist = [...(analytics.speakingTimeDistribution || [])].sort(
    (a, b) => b.duration - a.duration,
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Meeting Analytics
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Scores Overview */}
          <div className="grid grid-cols-3 gap-4">
            <ScoreGauge
              label="Engagement"
              score={analytics.engagementScore}
              color="indigo"
            />
            <ScoreGauge
              label="Efficiency"
              score={analytics.efficiencyScore}
              color="green"
            />
            <ScoreGauge
              label="Balance"
              score={Math.round(
                (1 - analytics.participationBalanceScore) * 100,
              )}
              color="purple"
            />
          </div>

          {/* Speaking Time Distribution */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Speaking Time Distribution
            </h3>
            <div className="space-y-3">
              {sortedDist.map((speaker, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-32 truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                    {speaker.userName}
                  </div>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${speaker.percentage}%` }}
                    ></div>
                  </div>
                  <div className="w-20 text-right text-sm font-bold text-gray-900 dark:text-white">
                    {speaker.percentage.toFixed(1)}%
                  </div>
                  <div className="w-20 text-right text-xs text-gray-500 dark:text-gray-400">
                    {Math.round(speaker.duration / 60)}m {speaker.duration % 60}
                    s
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Total Duration"
              value={`${analytics.duration} min`}
            />
            <MetricCard
              label="Participants"
              value={analytics.participantCount}
            />
            <MetricCard
              label="Action Items"
              value={analytics.actionItemsGenerated}
            />
            <MetricCard label="Silence Gaps" value={analytics.silencePeriods} />
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper: Circular Gauge for Scores
const ScoreGauge = ({ label, score, color }) => {
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;

  const colorMap = {
    indigo:
      "text-indigo-600 dark:text-indigo-400 stroke-indigo-600 dark:stroke-indigo-400",
    green:
      "text-green-600 dark:text-green-400 stroke-green-600 dark:stroke-green-400",
    purple:
      "text-purple-600 dark:text-purple-400 stroke-purple-600 dark:stroke-purple-400",
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r="40"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-gray-200 dark:text-gray-700"
          />
          <circle
            cx="48"
            cy="48"
            r="40"
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={colorMap[color]}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`text-2xl font-black ${colorMap[color].split(" ")[0]}`}
          >
            {score}
          </span>
        </div>
      </div>
      <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">
        {label}
      </p>
    </div>
  );
};

// Helper: Simple Metric Card
const MetricCard = ({ label, value }) => (
  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 text-center">
    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold mb-1">
      {label}
    </p>
    <p className="text-2xl font-black text-gray-900 dark:text-white">{value}</p>
  </div>
);

export default MeetingAnalyticsDetail;
