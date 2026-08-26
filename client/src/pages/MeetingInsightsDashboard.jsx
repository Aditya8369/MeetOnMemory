import React, { useState, useMemo } from "react";
import {
  Brain,
  Filter,
  RotateCcw,
  Download,
  Users,
  Clock,
  CheckCircle,
  DollarSign,
  Zap,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import {
  InsightCategory,
  CATEGORY_CONFIG,
  TrendDirection,
} from "./meetingInsightsTypes";
import {
  generateMockInsights,
  generateMockAttendanceTrend,
  generateMockEngagementData,
  generateMockMeetingTypeBreakdown,
  generateMockWeeklyMetrics,
  generateMockSentimentTimeline,
  generateMockActionItemStats,
  generateMockMeetingEfficiency,
  generateMockStats,
} from "./meetingInsightsData";
import {
  MetricCard,
  InsightCard,
  MemberCard,
  ActionItemStatCard,
} from "./MeetingInsightCards";
import {
  AttendanceTrendChart,
  MeetingTypeBreakdownChart,
  SentimentTimelineChart,
  WeeklyMetricsChart,
  EngagementRadarChart,
  EfficiencyBarChart,
  ActionItemsDonutChart,
  CostTrendChart,
} from "./MeetingInsightCharts";

const TABS = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "insights", label: "AI Insights", icon: Brain },
  { key: "engagement", label: "Engagement", icon: Users },
  { key: "actions", label: "Action Items", icon: CheckCircle },
  { key: "cost", label: "Cost & Efficiency", icon: DollarSign },
];

/* ─── Meeting Insights Dashboard ───────────────────────────────────── */
const MeetingInsightsDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [, setSelectedTimeRange] = useState("month");

  // Generate data
  const stats = useMemo(() => generateMockStats(), []);
  const insights = useMemo(() => generateMockInsights(12), []);
  const attendanceTrend = useMemo(() => generateMockAttendanceTrend(12), []);
  const engagementData = useMemo(() => generateMockEngagementData(), []);
  const meetingTypes = useMemo(() => generateMockMeetingTypeBreakdown(), []);
  const weeklyMetrics = useMemo(() => generateMockWeeklyMetrics(8), []);
  const sentimentTimeline = useMemo(
    () => generateMockSentimentTimeline(30),
    [],
  );
  const actionStats = useMemo(() => generateMockActionItemStats(), []);
  const efficiencyData = useMemo(() => generateMockMeetingEfficiency(), []);

  // Filter insights
  const filteredInsights = useMemo(() => {
    return insights.filter((insight) => {
      if (selectedCategory !== "all" && insight.category !== selectedCategory)
        return false;
      return true;
    });
  }, [insights, selectedCategory]);

  const resetFilters = () => {
    setSelectedCategory("all");
    setSelectedTimeRange("month");
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 via-white to-slate-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12">
        {/* Header */}
        <section className="mb-6 sm:mb-8">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
            <div className="h-1 bg-linear-to-r from-blue-600 via-violet-600 to-indigo-600" />
            <div className="px-5 py-7 sm:px-8 sm:py-9">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-900/30">
                    <Brain className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                      Meeting Insights
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-0.5">
                      AI-powered analytics for smarter meeting management
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/30 px-3 py-1 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                    <Sparkles className="h-3.5 w-3.5" />
                    AI-Powered
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Row */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6 sm:mb-8">
          <MetricCard
            icon={BarChart3}
            label="Total Meetings"
            value={stats.totalMeetings}
            subtitle="this month"
            color="#22c55e"
          />
          <MetricCard
            icon={Clock}
            label="Total Hours"
            value={`${stats.totalHours.toFixed(0)}h`}
            subtitle="in meetings"
            color="#0ea5e9"
          />
          <MetricCard
            icon={CheckCircle}
            label="Decisions"
            value={stats.totalDecisions}
            subtitle="made this month"
            color="#8b5cf6"
          />
          <MetricCard
            icon={Users}
            label="Avg Attendance"
            value={`${stats.avgAttendance.toFixed(0)}%`}
            subtitle={`${stats.activeMembers} active members`}
            color="#f59e0b"
          />
          <MetricCard
            icon={TrendingUp}
            label="Efficiency"
            value={`${stats.efficiencyScore}/100`}
            subtitle="meeting score"
            color="#14b8a6"
          />
          <MetricCard
            icon={DollarSign}
            label="Total Cost"
            value={`$${(stats.totalCost / 1000).toFixed(1)}k`}
            subtitle="meeting investment"
            color="#6366f1"
          />
        </section>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-gray-800 rounded-xl mb-6 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? "bg-white dark:bg-gray-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab: Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <AttendanceTrendChart data={attendanceTrend} />
              <WeeklyMetricsChart data={weeklyMetrics} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SentimentTimelineChart data={sentimentTimeline} />
              <MeetingTypeBreakdownChart data={meetingTypes} />
            </div>
          </div>
        )}

        {/* Tab: AI Insights */}
        {activeTab === "insights" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-slate-200/80 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-500">
                  Filter:
                </span>
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium bg-slate-50 dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="all">All Categories</option>
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
              <button
                onClick={resetFilters}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 transition"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
              </button>
              <span className="ml-auto text-[11px] text-slate-400">
                {filteredInsights.length} insights
              </span>
            </div>

            {/* Insight Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredInsights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          </div>
        )}

        {/* Tab: Engagement */}
        {activeTab === "engagement" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <EngagementRadarChart data={engagementData} />
              <EfficiencyBarChart data={efficiencyData} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">
                Team Members
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {engagementData.map((member) => (
                  <MemberCard key={member.id} member={member} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Action Items */}
        {activeTab === "actions" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <ActionItemStatCard stats={actionStats} />
            </div>
            <div className="lg:col-span-2">
              <ActionItemsDonutChart stats={actionStats} />
              <div className="mt-4 rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">
                  Priority Breakdown
                </h3>
                {Object.entries(actionStats.byPriority).map(
                  ([priority, data]) => {
                    const rate = Math.round(
                      (data.completed / data.total) * 100,
                    );
                    const color =
                      priority === "high"
                        ? "#ef4444"
                        : priority === "medium"
                          ? "#f59e0b"
                          : "#22c55e";
                    return (
                      <div key={priority} className="mb-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold capitalize text-slate-700 dark:text-gray-300">
                            {priority}
                          </span>
                          <span className="text-slate-500">
                            {data.completed}/{data.total} ({rate}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${rate}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Cost & Efficiency */}
        {activeTab === "cost" && (
          <div className="space-y-6">
            <CostTrendChart data={weeklyMetrics} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <EfficiencyBarChart data={efficiencyData} />
              <MeetingTypeBreakdownChart data={meetingTypes} />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-gray-700 text-center">
          <p className="text-xs text-slate-400 dark:text-gray-500">
            Meeting Insights Dashboard · Powered by AI Analysis · Data refreshes
            in real-time
          </p>
        </div>
      </div>
    </div>
  );
};

export default MeetingInsightsDashboard;
