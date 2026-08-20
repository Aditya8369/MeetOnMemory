import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { speakingTimeApi } from "../../services";
import { toast } from "react-toastify";

const COLORS = [
  "#3B82F6", // blue-500
  "#10B981", // emerald-500
  "#F59E0B", // amber-500
  "#EF4444", // red-500
  "#8B5CF6", // violet-500
  "#EC4899", // pink-500
  "#14B8A6", // teal-500
];

const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 shadow-md rounded-md">
        <p className="font-semibold text-gray-900 dark:text-gray-100">
          {data.speakerName}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Time: {formatDuration(data.totalDuration)}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Ratio: {data.talkRatio?.toFixed(1)}%
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Interruptions: {data.overlapCount}
        </p>
      </div>
    );
  }
  return null;
};

const SpeakingTimeBreakdown = ({ meetingId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await speakingTimeApi.getBreakdown(meetingId);
      if (res.data.success) {
        setData(res.data.data);
      } else {
        setError(res.data.message || "Failed to load speaking time data");
        toast.error("Failed to load speaking time data");
      }
    } catch (err) {
      console.error("Error fetching speaking time breakdown:", err);
      setError("Failed to load speaking time data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (meetingId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  if (loading) {
    return (
      <div className="animate-pulse flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <span className="text-gray-500">Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
        <p className="mb-4 text-center px-4">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-800/30 dark:hover:bg-red-800/50 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data || !data.participants || data.participants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-500">
        <p>No speaking time data available for this meeting.</p>
        <p className="text-sm">Wait for transcript processing to complete.</p>
      </div>
    );
  }

  const { participants, totalDuration } = data;

  // Sort participants by duration descending for charts
  const sortedParticipants = [...participants].sort(
    (a, b) => b.totalDuration - a.totalDuration,
  );

  // Find most active and most interrupted
  const mostActive = sortedParticipants[0];
  const mostInterruptions = [...participants].sort(
    (a, b) => b.overlapCount - a.overlapCount,
  )[0];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Speaking Time
          </h4>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatDuration(totalDuration)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Most Active
          </h4>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
            {mostActive?.speakerName}
          </p>
          <p className="text-sm text-gray-500">
            {mostActive?.talkRatio?.toFixed(1)}% of time
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Most Interruptions
          </h4>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
            {mostInterruptions?.speakerName}
          </p>
          <p className="text-sm text-gray-500">
            {mostInterruptions?.overlapCount} overlaps
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Speaking Time per Participant
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedParticipants}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#374151"
                  opacity={0.2}
                />
                <XAxis
                  type="number"
                  tickFormatter={formatDuration}
                  stroke="#6B7280"
                />
                <YAxis
                  dataKey="speakerName"
                  type="category"
                  width={100}
                  stroke="#6B7280"
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="totalDuration" radius={[0, 4, 4, 0]}>
                  {sortedParticipants.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Talk Ratio Distribution
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sortedParticipants}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="talkRatio"
                  nameKey="speakerName"
                >
                  {sortedParticipants.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpeakingTimeBreakdown;
