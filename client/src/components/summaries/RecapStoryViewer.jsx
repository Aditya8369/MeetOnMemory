import React, { useState, useEffect, useCallback } from "react";
import Stories from "react-insta-stories";
import { X, AlertCircle, RefreshCw } from "lucide-react";
import apiClient from "../../services/apiClient";

const THEMES = {
  blue: "bg-blue-600 text-white",
  green: "bg-emerald-600 text-white",
  violet: "bg-violet-600 text-white",
  amber: "bg-amber-600 text-white",
  rose: "bg-rose-600 text-white",
  dark: "bg-gray-900 text-white",
};

const SlideContent = ({ slide }) => {
  return (
    <div
      className={`w-full h-full flex flex-col justify-center items-center p-8 text-center ${THEMES[slide.theme] || THEMES.dark}`}
    >
      <h2 className="text-3xl font-bold mb-6 drop-shadow-md">{slide.title}</h2>
      <p className="text-xl leading-relaxed opacity-90">
        {slide.content || slide.summary}
      </p>
    </div>
  );
};

const RecapStoryViewer = ({ meetingId, onClose }) => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStory = useCallback(async () => {
    if (!meetingId) return;
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`/api/meetings/${meetingId}/story`);

      const rawStory = response.data?.story || response.data?.recapStory;
      if (response.data?.success && rawStory) {
        const slides = Array.isArray(rawStory)
          ? rawStory
          : rawStory.slides || [
              {
                title: rawStory.title || "Meeting Recap",
                content: rawStory.summary || "Summary of the meeting",
                theme: "blue",
              },
            ];
        const formattedStories = slides.map((slide) => ({
          content: (props) => <SlideContent slide={slide} {...props} />,
        }));
        setStories(formattedStories);
      } else {
        setError("Failed to load story");
      }
    } catch (err) {
      console.error("Error fetching story:", err);
      setError(
        err.response?.data?.message ||
          "Failed to load story. Please try again later.",
      );
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    fetchStory();
  }, [fetchStory]);

  if (loading) {
    return (
      <div
        role="dialog"
        aria-label="Loading recap story"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      >
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error || stories.length === 0) {
    return (
      <div
        role="dialog"
        aria-label="Recap story error"
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 text-white p-4"
      >
        <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col items-center text-center shadow-2xl">
          <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
          <h3 className="text-lg font-bold text-white mb-2">
            {error ? "Unable to Load Story" : "No Story Available"}
          </h3>
          <p className="text-sm text-gray-400 mb-6">
            {error || "No recap story is currently available for this meeting."}
          </p>
          <div className="flex gap-3">
            {error && (
              <button
                type="button"
                onClick={fetchStory}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold text-white transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm font-semibold text-gray-200 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Meeting recap story viewer"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close story viewer"
        className="absolute top-4 right-4 z-[110] p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors cursor-pointer"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="w-full max-w-sm sm:max-w-md h-full sm:h-[85vh] sm:rounded-xl overflow-hidden shadow-2xl relative">
        <Stories
          stories={stories}
          defaultInterval={5000}
          width="100%"
          height="100%"
          keyboardNavigation={true}
          onAllStoriesEnd={onClose}
        />
      </div>
    </div>
  );
};

export default RecapStoryViewer;
