import React, { useState, useEffect } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import api from "../services/apiClient";

const ParticipantEngagement = () => {
  const [scorecard, setScorecard] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  // For the sake of this mock/demo, we'll assume we can fetch for "me" or a specific ID
  // If "me", the backend needs to handle it. We'll assume the backend expects an actual ID,
  // but for the UI mock we'll use a dummy ID or handle it if we have auth context.
  // Actually, we'll fetch rankings first and use the first user's ID to fetch the scorecard.

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const rankingsRes = await api.get(
          "/api/engagement/organization/rankings",
        );
        if (
          rankingsRes.data.success &&
          rankingsRes.data.data.rankings.length > 0
        ) {
          setRankings(rankingsRes.data.data.rankings);
          const firstUserId = rankingsRes.data.data.rankings[0].userId._id;

          const scorecardRes = await api.get(
            `/api/engagement/participant/${firstUserId}`,
          );
          if (scorecardRes.data.success) {
            setScorecard(scorecardRes.data.data);
          }
        }
      } catch (error) {
        console.error("Error fetching engagement data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading Engagement Dashboard...
      </div>
    );
  }

  const radarData = scorecard
    ? [
        {
          subject: "Speaking",
          A: scorecard.dimensionalScores.speaking,
          fullMark: 100,
        },
        {
          subject: "Action Items",
          A: scorecard.dimensionalScores.actionItems,
          fullMark: 100,
        },
        {
          subject: "Decisions",
          A: scorecard.dimensionalScores.decisions,
          fullMark: 100,
        },
        {
          subject: "Attendance",
          A: scorecard.dimensionalScores.attendance,
          fullMark: 100,
        },
        {
          subject: "AI Quality",
          A: scorecard.dimensionalScores.aiQuality,
          fullMark: 100,
        },
      ]
    : [];

  const trendData = scorecard
    ? scorecard.historicalTrends.map((t) => ({
        name: new Date(t.date).toLocaleDateString(),
        score: t.score,
      }))
    : [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
        Participant Engagement
      </h1>

      {scorecard && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile & Overall Score */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 flex flex-col items-center justify-center">
            {scorecard.userId.profilePic ? (
              <img
                src={scorecard.userId.profilePic}
                alt="Profile"
                className="w-24 h-24 rounded-full mb-4"
              />
            ) : (
              <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl text-indigo-600">
                  {scorecard.userId.name?.charAt(0) || "U"}
                </span>
              </div>
            )}
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              {scorecard.userId.name}
            </h2>
            <p className="text-gray-500">{scorecard.userId.email}</p>
            <div className="mt-6 text-center">
              <span className="text-5xl font-black text-indigo-600">
                {scorecard.overallScore}
              </span>
              <p className="text-sm text-gray-500 uppercase tracking-wide mt-1">
                Overall Score
              </p>
            </div>
          </div>

          {/* Radar Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 flex flex-col">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              Dimensional Breakdown
            </h3>
            <div className="flex-grow w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  cx="50%"
                  cy="50%"
                  outerRadius="80%"
                  data={radarData}
                >
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar
                    name="Score"
                    dataKey="A"
                    stroke="#4f46e5"
                    fill="#4f46e5"
                    fillOpacity={0.6}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              AI Insights
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-green-600 uppercase">
                  Strengths
                </h4>
                <ul className="mt-2 list-disc list-inside text-gray-700 dark:text-gray-300">
                  {scorecard.aiInsights?.strengths?.map((s, i) => (
                    <li key={i}>{s}</li>
                  )) || <li>No insights available</li>}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-600 uppercase">
                  Growth Areas
                </h4>
                <ul className="mt-2 list-disc list-inside text-gray-700 dark:text-gray-300">
                  {scorecard.aiInsights?.growthAreas?.map((g, i) => (
                    <li key={i}>{g}</li>
                  )) || <li>No insights available</li>}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trend Line Chart */}
      {scorecard && trendData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Engagement Trend
          </h3>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#4f46e5"
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Rankings Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Organization Rankings
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
              <tr>
                <th className="px-6 py-4 font-medium text-sm">Participant</th>
                <th className="px-6 py-4 font-medium text-sm">Overall Score</th>
                <th className="px-6 py-4 font-medium text-sm">Speaking</th>
                <th className="px-6 py-4 font-medium text-sm">Action Items</th>
                <th className="px-6 py-4 font-medium text-sm">Decisions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {rankings.map((row) => (
                <tr
                  key={row._id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      {row.userId?.profilePic ? (
                        <img
                          src={row.userId.profilePic}
                          alt=""
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                          {row.userId?.name?.charAt(0) || "?"}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {row.userId?.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {row.userId?.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-bold">
                    {row.overallScore}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {row.dimensionalScores?.speaking || 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {row.dimensionalScores?.actionItems || 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {row.dimensionalScores?.decisions || 0}
                  </td>
                </tr>
              ))}
              {rankings.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No rankings found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ParticipantEngagement;
