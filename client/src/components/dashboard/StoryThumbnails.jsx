import React, { useState, useEffect } from "react";
import axios from "axios";
import RecapStoryViewer from "../summaries/RecapStoryViewer";
import { Play } from "lucide-react";

const StoryThumbnails = () => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMeetingId, setActiveMeetingId] = useState(null);

  useEffect(() => {
    const fetchRecentMeetings = async () => {
      try {
        const response = await axios.get("/api/meetings/stories/recent", {
          withCredentials: true,
        });
        if (response.data.success && response.data.meetings) {
          setMeetings(response.data.meetings);
        }
      } catch (err) {
        console.error("Error fetching recent meetings for stories:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentMeetings();
  }, []);

  if (loading || meetings.length === 0) return null;

  return (
    <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-slate-200/80 dark:border-gray-700">
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
        Recent Meeting Stories
      </h3>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {meetings.map((meeting) => (
          <div
            key={meeting._id}
            className="flex flex-col items-center gap-2 cursor-pointer flex-shrink-0 group"
            onClick={() => setActiveMeetingId(meeting._id)}
          >
            <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 group-hover:scale-105 transition-transform duration-200">
              <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 flex items-center justify-center p-1">
                <div className="w-full h-full rounded-full bg-slate-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden relative">
                  {/* We could use the org logo, but for now a gradient or icon works */}
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
