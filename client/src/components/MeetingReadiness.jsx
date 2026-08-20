import React, { useEffect, useState } from "react";
import { getMeetingReadiness } from "../api/meetingNudgeApi";

const MeetingReadiness = ({ meetingId }) => {
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReadiness = async () => {
      try {
        const data = await getMeetingReadiness(meetingId);
        setReadiness(data);
      } catch (err) {
        console.error("Failed to fetch readiness", err);
      } finally {
        setLoading(false);
      }
    };
    if (meetingId) fetchReadiness();
  }, [meetingId]);

  if (loading)
    return (
      <div className="p-4 text-gray-500 animate-pulse">
        Loading readiness...
      </div>
    );
  if (!readiness) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 border border-gray-100 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
        Meeting Readiness
      </h3>

      <div className="flex items-center justify-between mb-6">
        <div className="relative flex items-center justify-center w-24 h-24 rounded-full border-4 border-indigo-100 dark:border-indigo-900">
          <svg className="absolute inset-0 w-full h-full transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="44"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-indigo-100 dark:text-indigo-900"
            />
            <circle
              cx="48"
              cy="48"
              r="44"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={276}
              strokeDashoffset={276 - (276 * readiness.averageScore) / 100}
              className="text-indigo-600 dark:text-indigo-400 transition-all duration-1000 ease-out"
            />
          </svg>
          <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {readiness.averageScore}%
          </span>
        </div>
        <div className="ml-6 text-sm text-gray-600 dark:text-gray-300 flex-1">
          <p>
            Overall readiness is based on participants reviewing the agenda and
            resolving prior action items.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {readiness.participants.map((p, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-semibold">
                {p.user?.name?.charAt(0) || "?"}
              </div>
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {p.user?.name || "Unknown"}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold px-2 py-1 rounded bg-white dark:bg-gray-800 border dark:border-gray-600">
                {p.score}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MeetingReadiness;
