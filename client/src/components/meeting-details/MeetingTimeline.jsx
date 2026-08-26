import React, { useEffect, useState, useRef } from "react";
import { meetingTimelineApi } from "../../services/meetingTimelineApi";
import { useTimelineSync } from "../../hooks/useTimelineSync";
import TimelineFilters from "./TimelineFilters";
import TimelinePlayer from "./TimelinePlayer";

const MeetingTimeline = ({ meetingId, meeting }) => {
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    speaker_change: true,
    key_moment: true,
    sentiment_shift: true,
    annotation: true,
    action_item: true,
  });

  const {
    currentTime,
    duration,
    isPlaying,
    playerRef,
    seekTo,
    togglePlayPause,
    handleTimeUpdate,
    handleDurationChange,
    setIsPlaying,
  } = useTimelineSync();

  const timelineRef = useRef(null);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        setLoading(true);
        const { data } = await meetingTimelineApi.getMeetingTimeline(meetingId);
        if (data.success) {
          setTimelineEvents(data.timeline);
        } else {
          setError("Failed to load timeline events.");
        }
      } catch (err) {
        console.error("Timeline fetch error:", err);
        setError("Error fetching timeline events.");
      } finally {
        setLoading(false);
      }
    };
    fetchTimeline();
  }, [meetingId]);

  const handleToggleFilter = (key) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getMarkerColor = (type) => {
    switch (type) {
      case "speaker_change":
        return "bg-blue-500";
      case "key_moment":
        return "bg-purple-500";
      case "sentiment_shift":
        return "bg-green-500";
      case "annotation":
        return "bg-yellow-500";
      case "action_item":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getTooltipContent = (event) => {
    switch (event.type) {
      case "speaker_change":
        return `Speaker: ${event.data.speaker || "Unknown"}`;
      case "key_moment":
        return `Key Moment (${event.data.category}): ${event.data.snippet}`;
      case "sentiment_shift":
        return `Sentiment Shift: ${event.data.sentiment} (${event.data.score?.toFixed(2)})`;
      case "annotation":
        return `Annotation (${event.data.annotationType}): ${event.data.body}`;
      case "action_item":
        return `Action Item: ${event.data.text}`;
      default:
        return "Event";
    }
  };

  // The actual duration of the media may be different from the event timestamps max
  // We use the player duration if available, else max event time.
  const maxEventTime = timelineEvents.reduce(
    (max, ev) => Math.max(max, ev.endTime || 0),
    0,
  );
  const totalDuration = duration || maxEventTime || 1; // Fallback to 1 to avoid division by 0

  const filteredEvents = timelineEvents.filter((ev) => filters[ev.type]);

  const handleTimelineClick = (e) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = percentage * totalDuration;
    seekTo(targetTime);
  };

  if (loading) {
    return (
      <div className="animate-pulse h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 border border-red-200 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col gap-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Interactive Timeline
        </h3>
        <TimelineFilters filters={filters} onToggle={handleToggleFilter} />
      </div>

      <div className="relative group">
        <div
          ref={timelineRef}
          className="relative h-12 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden cursor-pointer shadow-inner border border-gray-200 dark:border-gray-700"
          onClick={handleTimelineClick}
        >
          {/* Progress Indicator */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-indigo-100 dark:bg-indigo-900/30 border-r border-indigo-400"
            style={{ width: `${(currentTime / totalDuration) * 100}%` }}
          ></div>

          {/* Markers */}
          {filteredEvents.map((event, index) => {
            const leftPercent = (event.startTime / totalDuration) * 100;
            const widthPercent = Math.max(
              0.5,
              ((event.endTime - event.startTime) / totalDuration) * 100,
            );
            return (
              <div
                key={index}
                className={`absolute top-1/2 -translate-y-1/2 h-3 rounded-full opacity-80 hover:opacity-100 hover:h-5 hover:z-10 transition-all ${getMarkerColor(event.type)}`}
                style={{
                  left: `${leftPercent}%`,
                  width: `${widthPercent}%`,
                  minWidth: "4px",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  seekTo(event.startTime);
                }}
                title={getTooltipContent(event)}
              ></div>
            );
          })}
        </div>

        <div className="flex justify-between text-xs text-gray-500 mt-2 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>

      <TimelinePlayer
        meeting={meeting}
        playerRef={playerRef}
        isPlaying={isPlaying}
        togglePlayPause={togglePlayPause}
        handleTimeUpdate={handleTimeUpdate}
        handleDurationChange={handleDurationChange}
        setIsPlaying={setIsPlaying}
      />
    </div>
  );
};

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
};

export default MeetingTimeline;
