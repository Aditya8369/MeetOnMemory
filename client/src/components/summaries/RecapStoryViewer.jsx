import React, { useState, useEffect } from "react";
import Stories from "react-insta-stories";
import { X, Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import axios from "axios";

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
      <p className="text-xl leading-relaxed opacity-90">{slide.content}</p>
    </div>
  );
};

const RecapStoryViewer = ({ meetingId, onClose }) => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStory = async () => {
      try {
        setLoading(true);
        // Using axios directly with credentials if meetingApi doesn't have a method yet
        const response = await axios.get(`/api/meetings/${meetingId}/story`, {
          withCredentials: true,
        });

        if (response.data.success && response.data.story) {
          const formattedStories = response.data.story.map((slide) => ({
            content: (props) => <SlideContent slide={slide} {...props} />,
          }));
          setStories(formattedStories);
        } else {
          setError("Failed to load story");
        }
      } catch (err) {
        console.error("Error fetching story:", err);
        setError("Failed to load story. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    if (meetingId) {
      fetchStory();
    }
  }, [meetingId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error || stories.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 text-white p-4">
        <p className="mb-4">
          {error || "No story available for this meeting."}
        </p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[110] p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors"
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
