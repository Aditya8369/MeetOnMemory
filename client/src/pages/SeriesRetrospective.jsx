import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getSeriesRetrospectiveOverview,
  getSeriesRetrospectiveTopics,
  getSeriesRetrospectiveActionItems,
  getSeriesRetrospectiveAttendance,
  getSeriesRetrospectiveSentiment,
  getSeriesRetrospectiveDecisions,
} from "../services/seriesRetrospectiveApi";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { toast } from "react-toastify";

const SeriesRetrospective = () => {
  const { seriesId } = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    overview: null,
    topics: null,
    actionItems: null,
    attendance: null,
    sentiment: null,
    decisions: null,
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load overview immediately
        const overviewRes = await getSeriesRetrospectiveOverview(seriesId);
        setData((prev) => ({ ...prev, overview: overviewRes }));

        // Load others in background
        Promise.all([
          getSeriesRetrospectiveTopics(seriesId),
          getSeriesRetrospectiveActionItems(seriesId),
          getSeriesRetrospectiveAttendance(seriesId),
          getSeriesRetrospectiveSentiment(seriesId),
          getSeriesRetrospectiveDecisions(seriesId),
        ])
          .then(([topicsRes, aiRes, attRes, sentRes, decRes]) => {
            setData((prev) => ({
              ...prev,
              topics: topicsRes.topics,
              actionItems: aiRes,
              attendance: attRes.attendance,
              sentiment: sentRes.sentiment,
              decisions: decRes,
            }));
          })
          .catch((err) => {
            console.error("Error loading detailed data", err);
          });
      } catch (err) {
        console.error(err);
        toast.error("Failed to load retrospective overview");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [seriesId]);

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "topics", label: "Topics" },
    { id: "actionItems", label: "Action Items" },
    { id: "attendance", label: "Attendance" },
    { id: "sentiment", label: "Sentiment" },
    { id: "decisions", label: "Decisions" },
  ];

  if (loading && !data.overview) {
    return (
      <div className="p-6">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderOverview = () => {
    if (!data.overview) return null;
    const { summary, metricsData } = data.overview;
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            AI Summary
          </h2>
          <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
            {summary}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">
              Total Meetings
            </h3>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {metricsData.totalMeetings}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">
              Action Item Completion
            </h3>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {metricsData.actionItemCompletionRate.toFixed(1)}%
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">
              Avg. Attendance
            </h3>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {metricsData.averageAttendance.toFixed(1)}%
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">
              Decision Follow-through
            </h3>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {metricsData.decisionFollowThroughRate.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderTopics = () => {
    if (!data.topics) return <div className="p-4">Loading topics...</div>;
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Topic Recurrence
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Topic
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Frequency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg. Confidence
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.topics.map((t, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {t.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {t.frequency}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {t.averageConfidence.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderActionItems = () => {
    if (!data.actionItems)
      return <div className="p-4">Loading action items...</div>;
    const { metrics, trend } = data.actionItems;
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Completion Trend
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trend}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="occurrence"
                  label={{
                    value: "Meeting Occurrence",
                    position: "insideBottomRight",
                    offset: -5,
                  }}
                />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="totalCreated"
                  stroke="#8884d8"
                  name="Created"
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="#82ca9d"
                  name="Completed"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {metrics.chronicCarryovers.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-red-600 mb-4">
              Chronic Carryovers (Warning)
            </h2>
            <ul className="space-y-2">
              {metrics.chronicCarryovers.map((ai) => (
                <li
                  key={ai.id}
                  className="p-3 bg-red-50 text-red-800 rounded-md"
                >
                  <span className="font-semibold">{ai.text}</span> - Rolled over{" "}
                  {ai.mergeCount} times (Owner: {ai.owner})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderAttendance = () => {
    if (!data.attendance)
      return <div className="p-4">Loading attendance...</div>;
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Participant Consistency
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attended
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.attendance.map((a, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {a.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {a.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {a.attended}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {a.attendanceRate.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderSentiment = () => {
    if (!data.sentiment) return <div className="p-4">Loading sentiment...</div>;
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Sentiment Timeline
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.sentiment}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="occurrence"
                label={{
                  value: "Meeting Occurrence",
                  position: "insideBottomRight",
                  offset: -5,
                }}
              />
              <YAxis domain={[-1, 1]} />
              <RechartsTooltip />
              <Legend />
              <Bar
                dataKey="averageScore"
                fill="#3b82f6"
                name="Average Sentiment Score"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderDecisions = () => {
    if (!data.decisions) return <div className="p-4">Loading decisions...</div>;
    const { total, resolved, open, decisions } = data.decisions;
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">
              Total Decisions
            </h3>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{total}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">Resolved</h3>
            <p className="mt-1 text-2xl font-semibold text-green-600">
              {resolved}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500">Open</h3>
            <p className="mt-1 text-2xl font-semibold text-yellow-600">
              {open}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Decision Log
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Decision
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Occurrence
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {decisions.map((d, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {d.text}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${d.status === "resolved" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {d.owner || "Unassigned"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      #{d.occurrence}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Series Retrospective
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Longitudinal analysis across meeting occurrences
          </p>
        </div>
        <Link
          to="/dashboard"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Back to Dashboard
        </Link>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav
          className="-mb-px flex space-x-8 overflow-x-auto"
          aria-label="Tabs"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-4">
        {activeTab === "overview" && renderOverview()}
        {activeTab === "topics" && renderTopics()}
        {activeTab === "actionItems" && renderActionItems()}
        {activeTab === "attendance" && renderAttendance()}
        {activeTab === "sentiment" && renderSentiment()}
        {activeTab === "decisions" && renderDecisions()}
      </div>
    </div>
  );
};

export default SeriesRetrospective;
