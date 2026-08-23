import React, { useState, useMemo } from "react";
import {
  Shield, Activity, AlertTriangle, Users, Lightbulb,
  Filter, RotateCcw, TrendingUp, CheckCircle, Clock,
  ChevronDown, Sparkles, BarChart3, Zap,
} from "lucide-react";
import {
  HealthScoreRing, MetricScoreCard, IssueCard, TeamHealthCard,
  InsightCard, MeetingTypeHealthCard,
} from "./HealthCards";
import {
  HealthTrendChart, TeamComparisonBarChart, MetricRadarChart,
  IssueSeverityPieChart, MeetingTypeHealthBarChart, IssueTrendChart,
} from "./HealthCharts";
import {
  generateMockOverallHealth, generateMockHealthTrend,
  generateMockTeamHealth, generateMockIssues,
  generateMockMeetingHealthDetails, generateMockActionableInsights,
} from "./healthData";
import { MOCK_TEAMS } from "./healthTypes";

const TABS = [
  { key: "overview", label: "Overview", icon: Activity },
  { key: "metrics", label: "Metrics", icon: BarChart3 },
  { key: "issues", label: "Issues", icon: AlertTriangle },
  { key: "teams", label: "Teams", icon: Users },
  { key: "improvements", label: "Improvements", icon: Lightbulb },
];

/* ─── Meeting Health Dashboard ─────────────────────────────────────── */
const MeetingHealthDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedTeam, setSelectedTeam] = useState("all");

  // Data
  const overallHealth = useMemo(() => generateMockOverallHealth(), []);
  const healthTrend = useMemo(() => generateMockHealthTrend(12), []);
  const teamHealth = useMemo(() => generateMockTeamHealth(), []);
  const issues = useMemo(() => generateMockIssues(15), []);
  const meetingDetails = useMemo(() => generateMockMeetingHealthDetails(), []);
  const insights = useMemo(() => generateMockActionableInsights(), []);

  const unresolvedIssues = issues.filter((i) => !i.isResolved);
  const resolvedIssues = issues.filter((i) => i.isResolved);
  const criticalIssues = issues.filter((i) => i.severity === "critical" || i.severity === "error");

  const filteredTeams = useMemo(() => {
    if (selectedTeam === "all") return teamHealth;
    return teamHealth.filter((t) => t.team === selectedTeam);
  }, [teamHealth, selectedTeam]);

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 via-white to-slate-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12">
        {/* Header */}
        <section className="mb-6 sm:mb-8">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
            <div className="h-1 bg-linear-to-r from-emerald-600 via-blue-600 to-violet-600" />
            <div className="px-5 py-7 sm:px-8 sm:py-9">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
                    <Shield className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                      Meeting Health Dashboard
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-0.5">
                      Monitor meeting quality, track issues, and optimize team performance
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${
                    unresolvedIssues.length > 5 ? "border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300" :
                    "border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                  }`}>
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {unresolvedIssues.length} Open Issues
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Health Score + Stats */}
        <section className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6 sm:mb-8">
          <div className="lg:col-span-1 flex justify-center">
            <HealthScoreRing score={overallHealth.overallScore} size={140} />
          </div>
          <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{overallHealth.grade}</p>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Grade</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{overallHealth.totalMeetingsAnalyzed}</p>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Meetings Analyzed</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-amber-600">{criticalIssues.length}</p>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Critical Issues</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-emerald-600">{resolvedIssues.length}</p>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Resolved</p>
            </div>
          </div>
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
            <HealthTrendChart data={healthTrend} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <MetricRadarChart scores={overallHealth.scores} />
              <IssueSeverityPieChart issues={issues} />
            </div>
          </div>
        )}

        {/* Tab: Metrics */}
        {activeTab === "metrics" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {overallHealth.scores.map((score) => (
                <MetricScoreCard key={score.metric} healthScore={score} />
              ))}
            </div>
            <MeetingTypeHealthBarChart data={meetingDetails} />
          </div>
        )}

        {/* Tab: Issues */}
        {activeTab === "issues" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-semibold text-slate-500">{unresolvedIssues.length} open</span>
              <span className="text-xs text-slate-300">·</span>
              <span className="text-xs font-semibold text-emerald-500">{resolvedIssues.length} resolved</span>
              <span className="text-xs text-slate-300">·</span>
              <span className="text-xs font-semibold text-red-500">{criticalIssues.length} critical</span>
            </div>
            <IssueTrendChart issues={issues} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {issues.map((issue) => (
                <IssueCard key={issue.id} issue={issue} />
              ))}
            </div>
          </div>
        )}

        {/* Tab: Teams */}
        {activeTab === "teams" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Teams</option>
                {MOCK_TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTeams.map((team) => (
                <TeamHealthCard key={team.team} team={team} />
              ))}
            </div>
            <TeamComparisonBarChart data={filteredTeams} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {meetingDetails.map((detail) => (
                <MeetingTypeHealthCard key={detail.type} detail={detail} />
              ))}
            </div>
          </div>
        )}

        {/* Tab: Improvements */}
        {activeTab === "improvements" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 p-5">
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="h-5 w-5 text-violet-600" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Potential Improvement: +{insights.reduce((sum, i) => sum + i.estimatedImprovement, 0)}%
                </h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-gray-400">
                AI analysis identified {insights.length} actionable improvements. Implementing all could boost your health score significantly.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-gray-700 text-center">
          <p className="text-xs text-slate-400 dark:text-gray-500">
            Meeting Health Dashboard · AI-Powered Analysis · Real-time Monitoring
          </p>
        </div>
      </div>
    </div>
  );
};

export default MeetingHealthDashboard;
