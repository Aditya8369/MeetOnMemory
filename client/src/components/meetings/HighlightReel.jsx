import React, { useEffect, useState, useCallback } from "react";
import highlightReelApi from "../../api/highlightReelApi";
import { toast } from "react-toastify";

const HighlightReel = ({ meetingId }) => {
  const [reel, setReel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const fetchReel = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await highlightReelApi.getHighlightReel(meetingId);
      if (data.success && data.data) {
        setReel(data.data);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        // Not found is fine, just means it hasn't been generated yet
        setReel(null);
      } else {
        setError("Failed to fetch highlight reel.");
      }
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    if (meetingId) {
      fetchReel();
    }
  }, [meetingId, fetchReel]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const { data } = await highlightReelApi.generateHighlightReel(meetingId);
      if (data.success) {
        toast.info("Highlight Reel generation started. Check back shortly.");
        // We set status locally to pending to show the UI
        setReel({ status: "pending" });
        // Poll for completion (simple approach)
        const interval = setInterval(async () => {
          try {
            const res = await highlightReelApi.getHighlightReel(meetingId);
            if (res.data.success && res.data.data.status !== "pending") {
              setReel(res.data.data);
              clearInterval(interval);
            }
          } catch {
            // Ignore interval errors
          }
        }, 5000);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to generate reel");
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async () => {
    try {
      const response =
        await highlightReelApi.exportHighlightReelHtml(meetingId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `highlight_reel_${meetingId}.html`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch {
      toast.error("Failed to export HTML");
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse h-32 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>
    );
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!reel || reel.status === "failed") {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center justify-center text-center">
        <h3 className="text-lg font-bold mb-2">AI-Curated Highlight Reel</h3>
        <p className="text-gray-500 mb-4 max-w-md">
          Generate a narrative-driven reel of the most important moments,
          decisions, and breakthroughs from this meeting.
        </p>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
        >
          {generating ? (
            <>
              <svg
                className="animate-spin h-5 w-5 text-white"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Starting Generation...
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                ></path>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              Generate Highlight Reel
            </>
          )}
        </button>
        {reel?.status === "failed" && (
          <p className="text-red-500 mt-2 text-sm">
            Previous generation failed. You can try again.
          </p>
        )}
      </div>
    );
  }

  if (reel.status === "pending") {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center justify-center text-center h-48">
        <svg
          className="animate-spin h-8 w-8 text-blue-500 mb-4"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          AI is curating your highlight reel...
        </h3>
        <p className="text-gray-500 text-sm mt-2">
          This usually takes about a minute. The reel will appear here
          automatically.
        </p>
      </div>
    );
  }

  const sentimentColors = {
    positive:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    neutral: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    negative: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  const formatTime = (seconds) => {
    return new Date(seconds * 1000).toISOString().substr(11, 8);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Highlight Reel
          </h2>
          <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line max-w-3xl">
            {reel.narrative}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg text-sm font-medium transition-colors"
          >
            Export HTML
          </button>
          <button
            onClick={handleGenerate}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            Regenerate
          </button>
        </div>
      </div>

      <div className="space-y-6 mt-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-300 dark:before:via-gray-600 before:to-transparent">
        {reel.highlights.map((h, i) => (
          <div
            key={i}
            className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
          >
            {/* Timeline dot */}
            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-gray-800 bg-blue-500 text-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow">
              <span className="text-xs font-bold">{i + 1}</span>
            </div>

            {/* Card */}
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl shadow border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/80 backdrop-blur-sm">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                    {h.type}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTime(h.timestamp)}
                  </span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${sentimentColors[h.sentiment]}`}
                >
                  {h.sentiment}
                </span>
              </div>

              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                {h.speaker}
              </div>

              <blockquote className="text-lg font-medium italic text-gray-900 dark:text-white border-l-4 border-indigo-500 pl-3 my-3">
                "{h.excerpt}"
              </blockquote>

              <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-2 rounded">
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  Why it matters:{" "}
                </span>
                {h.aiRationale}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HighlightReel;
