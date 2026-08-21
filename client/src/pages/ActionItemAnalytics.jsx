import React, { useState } from "react";
import { format, subDays } from "date-fns";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from "recharts";
import { useActionItemAnalytics } from "../hooks/useActionItemAnalytics";
import {
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];
const PRIORITY_COLORS = {
  low: "#00C49F",
  medium: "#0088FE",
  high: "#FFBB28",
  urgent: "#FF8042",
};

const ActionItemAnalytics = () => {
  useTranslation();
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
  });

  const {
    metrics,
    leaderboards,
    priorityBreakdowns,
    overdueTrends,
    meetingEffectiveness,
    isLoading,
    error,
  } = useActionItemAnalytics(dateRange.startDate, dateRange.endDate);

  const handleDateChange = (e) => {
    setDateRange({ ...dateRange, [e.target.name]: e.target.value });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg shadow">
          {error}
        </div>
      </div>
    );
  }

  // Format data for charts
  const priorityData = priorityBreakdowns.map((p) => ({
    name: p.priority.charAt(0).toUpperCase() + p.priority.slice(1),
    value: p.count,
    color: PRIORITY_COLORS[p.priority] || COLORS[0],
  }));

  const trendData = overdueTrends.map((t) => ({
    name: `Week ${t.week}`,
    New: t.newItems,
    Resolved: t.resolvedItems,
    Overdue: t.overdueItems,
  }));

  const scatterData = meetingEffectiveness.map((m) => ({
    name: m.meetingTitle,
    x: m.totalItems,
    y: m.completionRate,
    z: 1, // Size
  }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Action Item Analytics
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Track completion rates and team accountability
            </p>
          </div>
          <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <input
                type="date"
                name="startDate"
                value={dateRange.startDate}
                onChange={handleDateChange}
                className="bg-transparent border-none focus:ring-0 text-sm text-gray-700 dark:text-gray-300"
              />
            </div>
            <span className="text-gray-400">to</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                name="endDate"
                value={dateRange.endDate}
                onChange={handleDateChange}
                className="bg-transparent border-none focus:ring-0 text-sm text-gray-700 dark:text-gray-300"
              />
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard
            title="Total Action Items"
            value={metrics?.total || 0}
            icon={<Activity className="w-6 h-6 text-blue-500" />}
            color="bg-blue-50 dark:bg-blue-900/20"
          />
          <KpiCard
            title="Completion Rate"
            value={`${Math.round(metrics?.completionRate || 0)}%`}
            icon={<CheckCircle className="w-6 h-6 text-green-500" />}
            color="bg-green-50 dark:bg-green-900/20"
          />
          <KpiCard
            title="On-Time Rate"
            value={`${Math.round(metrics?.onTimeRate || 0)}%`}
            icon={<Clock className="w-6 h-6 text-purple-500" />}
            color="bg-purple-50 dark:bg-purple-900/20"
          />
          <KpiCard
            title="Overdue Items"
            value={metrics?.overdue || 0}
            icon={<AlertTriangle className="w-6 h-6 text-red-500" />}
            color="bg-red-50 dark:bg-red-900/20"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overdue Trends */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Action Item Trends
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#374151"
                    opacity={0.2}
                  />
                  <XAxis dataKey="name" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      borderColor: "#374151",
                      color: "#F9FAFB",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="New"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Resolved"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Overdue"
                    stroke="#EF4444"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Priority Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              By Priority
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      borderColor: "#374151",
                      color: "#F9FAFB",
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assignee Leaderboard */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 overflow-hidden flex flex-col">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Team Accountability
            </h3>
            <div className="overflow-x-auto flex-1">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assignee
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completed
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {leaderboards.slice(0, 8).map((user) => (
                    <tr key={user.assigneeId}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold mr-3">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400">
                        {user.totalAssigned}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400">
                        {user.totalCompleted}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.completionRate >= 80
                              ? "bg-green-100 text-green-800"
                              : user.completionRate >= 50
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {Math.round(user.completionRate)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {leaderboards.length === 0 && (
                    <tr>
                      <td
                        colSpan="4"
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        No team data available for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Meeting Effectiveness */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Meeting Effectiveness (Items vs Completion Rate)
            </h3>
            <div className="h-80 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#374151"
                    opacity={0.2}
                  />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Total Items"
                    stroke="#6B7280"
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Completion %"
                    stroke="#6B7280"
                    domain={[0, 100]}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-gray-800 border border-gray-700 p-3 rounded-lg shadow-lg">
                            <p className="text-white font-medium truncate max-w-[200px] mb-1">
                              {data.name}
                            </p>
                            <p className="text-gray-300 text-sm">
                              Items: {data.x}
                            </p>
                            <p className="text-gray-300 text-sm">
                              Completed: {Math.round(data.y)}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter name="Meetings" data={scatterData} fill="#8B5CF6" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">
              Top right represents highly actionable and effective meetings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Component
const KpiCard = ({ title, value, icon, color }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex items-center">
    <div className={`p-4 rounded-full ${color} mr-4`}>{icon}</div>
    <div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {title}
      </p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  </div>
);

export default ActionItemAnalytics;
