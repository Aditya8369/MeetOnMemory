import React, { useState, useEffect } from "react";
import { Play, AlertCircle, RefreshCw } from "lucide-react";
import apiClient from "../../services/apiClient";
import RecapStoryViewer from "../summaries/RecapStoryViewer";

const StoryThumbnails = () => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeMeetingId, setActiveMeetingId] = useState(null);

  const fetchRecentMeetings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get("/api/meetings/stories/recent");
      if (response.data.success && response.data.meetings) {
        setMeetings(response.data.meetings);
      } else {
        setMeetings(response.data.meetings || []);
      }
    } catch (err) {
      console.error("Error fetching recent meetings for stories:", err);
      setError(
        err.response?.data?.message ||
          "Unable to load recent meeting stories. Please check your connection.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentMeetings();
  }, []);

  if (loading) {
    return (
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-slate-200/80 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
          Recent Meeting Stories
        </h3>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="flex flex-col items-center gap-2 flex-shrink-0 animate-pulse"
            >
              <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-gray-700" />
              <div className="h-3 w-16 bg-slate-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="mb-6 bg-red-50/80 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500 dark:text-red-400" />
          <p className="text-sm font-medium">{error}</p>
        </div>
        <button
          type="button"
          onClick={fetchRecentMeetings}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-100 dark:bg-red-800/40 text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800/60 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  if (meetings.length === 0) return null;

  return (
    <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-slate-200/80 dark:border-gray-700">
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
        Recent Meeting Stories
      </h3>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {meetings.map((meeting) => (
          <div
            key={meeting._id || meeting.id}
            role="button"
            tabIndex={0}
            aria-label={`Open story for ${meeting.title}`}
            className="flex flex-col items-center gap-2 cursor-pointer flex-shrink-0 group focus:outline-none"
            onClick={() => setActiveMeetingId(meeting._id || meeting.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setActiveMeetingId(meeting._id || meeting.id);
              }
            }}
          >
            <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 group-hover:scale-105 group-focus:scale-105 transition-transform duration-200">
              <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 flex items-center justify-center p-1">
                <div className="w-full h-full rounded-full bg-slate-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden relative">
                  <Play className="w-6 h-6 text-slate-400 dark:text-gray-400" />
                </div>
              </div>
            </div>
            <span className="text-xs font-medium text-slate-700 dark:text-gray-300 w-20 text-center truncate">
              {meeting.title}
            </span>
          </div>
        ))}
      </div>

      {activeMeetingId && (
        <RecapStoryViewer
          meetingId={activeMeetingId}
          onClose={() => setActiveMeetingId(null)}
        />
      )}
    </div>
  );
};

export default StoryThumbnails;
