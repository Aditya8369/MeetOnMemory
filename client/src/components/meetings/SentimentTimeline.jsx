import React, { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { sentimentTimelineApi } from "../../services";

const SentimentTimeline = ({ meetingId }) => {
  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchTimeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  const fetchTimeline = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await sentimentTimelineApi.getTimeline(meetingId);
      if (data.success && data.timeline) {
        setTimeline(data.timeline);
      }
    } catch (err) {
      if (err.response && err.response.status === 404) {
        // Not found is fine, we just haven't generated it yet
        setTimeline(null);
      } else {
        console.error("Error fetching sentiment timeline:", err);
        setError("Failed to load sentiment timeline.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      const { data } = await sentimentTimelineApi.generateTimeline(meetingId);
      if (data.success && data.timeline) {
        setTimeline(data.timeline);
      }
    } catch (err) {
      console.error("Error generating sentiment timeline:", err);
      setError("Failed to generate sentiment timeline. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 shadow-lg rounded max-w-sm">
          <p className="font-semibold text-gray-800">
            {formatTime(data.startTime)} - {formatTime(data.endTime)}
          </p>
          <div className="my-2">
            <span className="font-medium text-sm text-gray-500 uppercase">
              Sentiment:
            </span>
            <span
              className={`ml-2 font-bold capitalize ${
                data.sentiment === "positive"
                  ? "text-green-600"
                  : data.sentiment === "negative"
                    ? "text-red-600"
                    : "text-gray-600"
              }`}
            >
              {data.sentiment} ({data.score.toFixed(2)})
            </span>
          </div>
          {data.agendaItemText && (
            <div className="text-sm text-gray-700 mt-2 bg-gray-50 p-2 rounded">
              <span className="font-semibold block mb-1">Agenda Item:</span>
              {data.agendaItemText}
            </div>
          )}
          {data.textSnippet && (
            <div className="text-sm italic text-gray-600 mt-2 border-l-2 border-gray-300 pl-2">
              "{data.textSnippet}"
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-lg h-64 w-full flex items-center justify-center">
        <span className="text-gray-500">Loading timeline...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        <p>{error}</p>
        <button
          onClick={fetchTimeline}
          className="mt-2 text-sm underline hover:text-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!timeline || timeline.status !== "completed") {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <svg
          className="w-12 h-12 text-gray-400 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Sentiment Timeline
        </h3>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          Generate an AI-powered timeline of sentiment shifts throughout the
          meeting to understand when discussions were most positive or
          contentious.
        </p>
        <button
          onClick={handleGenerate}
          disabled={
            isGenerating || (timeline && timeline.status === "processing")
          }
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating || (timeline && timeline.status === "processing") ? (
            <span className="flex items-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Generating Timeline...
            </span>
          ) : (
            "Generate Timeline"
          )}
        </button>
      </div>
    );
  }

  // Formatting data for Recharts
  const chartData = timeline.segments.map((seg) => ({
    ...seg,
    displayTime: formatTime(seg.startTime),
  }));

  // Gradient definitions for positive/negative areas
  const gradientOffset = () => {
    const dataMax = Math.max(...chartData.map((i) => i.score));
    const dataMin = Math.min(...chartData.map((i) => i.score));

    if (dataMax <= 0) return 0;
    if (dataMin >= 0) return 1;

    return dataMax / (dataMax - dataMin);
  };

  const off = gradientOffset();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Sentiment Timeline
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Visualizes emotional tone across meeting segments.
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
          title="Regenerate Timeline"
        >
          {isGenerating ? "Regenerating..." : "Regenerate"}
        </button>
      </div>

      {timeline.overallArc && (
        <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r">
          <p className="text-sm text-blue-800 italic">{timeline.overallArc}</p>
        </div>
      )}

      <div className="h-72 w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset={off} stopColor="#10B981" stopOpacity={0.8} />
                <stop offset={off} stopColor="#EF4444" stopOpacity={0.8} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              opacity={0.4}
            />
            <XAxis
              dataKey="displayTime"
              tick={{ fontSize: 12, fill: "#6B7280" }}
              tickMargin={10}
              minTickGap={30}
            />
            <YAxis
              domain={[-1, 1]}
              tick={{ fontSize: 12, fill: "#6B7280" }}
              tickFormatter={(val) => val.toFixed(1)}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#9CA3AF" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="score"
              stroke="#000"
              strokeWidth={0}
              fill="url(#splitColor)"
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SentimentTimeline;
