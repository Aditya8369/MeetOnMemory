import React, { useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ShieldAlert,
  TrendingUp,
  CheckCircle,
  Activity,
  BarChart2,
} from "lucide-react";
import { useEffectivenessScore } from "../hooks/useEffectivenessScore";
// Assuming clerk is used, or maybe just a generic user context, but let's mock the currentOrg if needed.
// Wait, I will just use dummy orgId for the showcase if not provided, or extract from context if typical.
// I'll grab organizationId from a query param or default.

const MeetingEffectiveness = () => {
  const { meetingId } = useParams();
  const [searchParams] = useSearchParams();
  const organizationId = searchParams.get("orgId") || "demo-org-id";
  const seriesId = searchParams.get("seriesId");

  const {
    loading,
    error,
    meetingScore,
    orgTrends,
    seriesTrends,
    fetchMeetingScore,
    fetchOrgTrends,
    fetchSeriesTrends,
  } = useEffectivenessScore();

  useEffect(() => {
    if (meetingId) {
      fetchMeetingScore(meetingId);
    }
    fetchOrgTrends(organizationId);
    if (seriesId) {
      fetchSeriesTrends(seriesId);
    }
  }, [
    meetingId,
    organizationId,
    seriesId,
    fetchMeetingScore,
    fetchOrgTrends,
    fetchSeriesTrends,
  ]);

  const renderRadarChart = () => {
    if (!meetingScore) return null;

    const { dimensions } = meetingScore;
    const data = [
      { subject: "Goals", A: dimensions.goalCompletionRate, fullMark: 100 },
      {
        subject: "Action Items",
        A: dimensions.actionItemFollowThrough,
        fullMark: 100,
      },
      {
        subject: "Satisfaction",
        A: dimensions.participantSatisfaction,
        fullMark: 100,
      },
      { subject: "Clarity", A: dimensions.decisionClarity, fullMark: 100 },
      { subject: "Time", A: dimensions.timeEfficiency, fullMark: 100 },
    ];

    return (
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" />
          <PolarRadiusAxis angle={30} domain={[0, 100]} />
          <Radar
            name="Meeting"
            dataKey="A"
            stroke="#8884d8"
            fill="#8884d8"
            fillOpacity={0.6}
          />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    );
  };

  const renderLineChart = (data) => {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="averageScore"
            stroke="#82ca9d"
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderSparkline = (data) => {
    return (
      <ResponsiveContainer width="100%" height={100}>
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="overallScore"
            stroke="#ff7300"
            strokeWidth={2}
            dot={false}
          />
          <Tooltip />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Activity className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-red-50 text-red-600 rounded-lg shadow mt-8 max-w-lg mx-auto">
        <ShieldAlert className="mx-auto mb-4" size={48} />
        <h2 className="text-xl font-semibold mb-2">Error Loading Scorecard</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <BarChart2 className="text-blue-600" size={32} />
          Meeting Effectiveness Scorecard
        </h1>
        <p className="text-gray-500 mt-2">
          Analyze post-meeting outcomes to ensure your meetings actually achieve
          their goals.
        </p>
      </header>

      {/* Main Score & Radar */}
      {meetingScore && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center">
            <h2 className="text-lg font-medium text-gray-700 mb-2">
              Overall Effectiveness
            </h2>
            <div className="text-6xl font-bold text-blue-600 mb-4">
              {meetingScore.overallScore}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <CheckCircle size={16} className="text-green-500" />
              <span>Based on 5 key dimensions</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
            <h2 className="text-lg font-medium text-gray-700 mb-4">
              Dimension Breakdown
            </h2>
            {renderRadarChart()}
          </div>
        </div>
      )}

      {/* Trends Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {orgTrends.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="text-indigo-500" size={24} />
              <h2 className="text-lg font-medium text-gray-700">
                Organization Benchmark
              </h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              How effective are meetings across the entire organization?
            </p>
            {renderLineChart(orgTrends)}
          </div>
        )}

        {seriesTrends.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="text-orange-500" size={24} />
              <h2 className="text-lg font-medium text-gray-700">
                Series Trend
              </h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Is this recurring meeting getting better over time?
            </p>
            {renderSparkline(seriesTrends)}
            <div className="mt-4 pt-4 border-t border-gray-50 text-sm text-gray-500">
              Showing the last {seriesTrends.length} meetings in this series.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingEffectiveness;
