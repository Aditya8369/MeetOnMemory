import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";
import { speakingTimeApi } from "../services";
import { toast } from "react-toastify";

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
          {data.meetingTitle}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {new Date(data.date).toLocaleDateString()}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
          Talk Ratio: {data.talkRatio?.toFixed(1)}%
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Time: {formatDuration(data.totalDuration)}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Interruptions: {data.overlapCount}
        </p>
      </div>
    );
  }
  return null;
};

const SpeakingTimeTrends = () => {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        setLoading(true);
        const res = await speakingTimeApi.getTrends(10);
        if (res.data.success) {
          // Format date for display on axis
          const formattedData = res.data.data.map((item) => ({
            ...item,
            displayDate: new Date(item.date).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            }),
          }));
          setTrends(formattedData);
        } else {
          toast.error("Failed to load speaking trends");
        }
      } catch (err) {
        console.error("Error fetching speaking trends:", err);
        toast.error("An error occurred while loading trends");
      } finally {
        setLoading(false);
      }
    };
    fetchTrends();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 flex items-center justify-center">
        <span className="text-gray-500">Loading your speaking trends...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Speaking Time Trends
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Analyze your participation across recent meetings
            </p>
          </div>
        </div>

        {trends.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-center">
            <p className="text-gray-500">No meeting data available yet.</p>
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Talk Ratio Over Time (%)
              </h2>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trends}
                    margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#374151"
                      opacity={0.2}
                    />
                    <XAxis
                      dataKey="displayDate"
                      stroke="#6B7280"
                      tick={{ fill: "#6B7280" }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      stroke="#6B7280"
                      tick={{ fill: "#6B7280" }}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <RechartsTooltip content={<CustomTooltip />} />

                    {/* Target band: 20% to 50% is generally a healthy participation range in small meetings */}
                    <ReferenceArea
                      y1={20}
                      y2={50}
                      fill="#10B981"
                      fillOpacity={0.1}
                    />

                    <Line
                      type="monotone"
                      dataKey="talkRatio"
                      stroke="#3B82F6"
                      strokeWidth={3}
                      activeDot={{ r: 8 }}
                      dot={{
                        r: 4,
                        fill: "#3B82F6",
                        strokeWidth: 2,
                        stroke: "#fff",
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex items-center justify-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                  Your Talk Ratio
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded bg-emerald-500 opacity-20 mr-2"></div>
                  Healthy Target Zone (20-50%)
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Recent Meetings Breakdown
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
                  <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-3 rounded-tl-lg">Meeting</th>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Talk Ratio</th>
                      <th className="px-6 py-3">Duration</th>
                      <th className="px-6 py-3 rounded-tr-lg">Interrupts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Reverse trends to show most recent first in table */}
                    {[...trends].reverse().map((meeting) => (
                      <tr
                        key={meeting.meetingId}
                        className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          <Link
                            to={`/meeting/${meeting.meetingId}`}
                            className="hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            {meeting.meetingTitle}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          {new Date(meeting.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <span className="mr-2">
                              {meeting.talkRatio?.toFixed(1)}%
                            </span>
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500"
                                style={{
                                  width: `${Math.min(100, Math.max(0, meeting.talkRatio || 0))}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {formatDuration(meeting.totalDuration)}
                        </td>
                        <td className="px-6 py-4">{meeting.overlapCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SpeakingTimeTrends;
