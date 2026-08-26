import React, { useState, useMemo } from "react";
import {
  GitBranch,
  Lightbulb,
  BarChart3,
  Users,
  Target,
  CheckCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Filter,
  RotateCcw,
  ChevronDown,
} from "lucide-react";
import {
  DecisionStatus,
  DecisionCategory,
  DecisionImpact,
} from "./decisionTypes";
import {
  DecisionMetricCard,
  DecisionCard,
  DecisionRecommendationCard,
  DecisionPipelineCard,
} from "./DecisionCards";
import {
  DecisionTrendChart,
  CategoryBreakdownChart,
  ImplementationSpeedChart,
  ImpactAnalysisChart,
  DecisionVelocityChart,
  ApprovalFunnelChart,
} from "./DecisionCharts";
import {
  generateMockDecisions,
  generateMockDecisionTrend,
  generateMockDecisionByCategory,
  generateMockDecisionByImpact,
  generateMockImplementationTimeline,
  generateMockDecisionVelocity,
  generateMockStats,
  generateMockRecommendations,
} from "./decisionData";

const TABS = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "decisions", label: "All Decisions", icon: GitBranch },
  { key: "velocity", label: "Velocity", icon: TrendingUp },
  { key: "improvements", label: "Improvements", icon: Lightbulb },
];

/* ─── Decision Tracking Dashboard ──────────────────────────────────── */
const DecisionTrackingDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [impactFilter, setImpactFilter] = useState("all");

  // Data
  const stats = useMemo(() => generateMockStats(), []);
  const decisions = useMemo(() => generateMockDecisions(20), []);
  const trend = useMemo(() => generateMockDecisionTrend(12), []);
  const categoryData = useMemo(() => generateMockDecisionByCategory(), []);
  const impactData = useMemo(() => generateMockDecisionByImpact(), []);
  const implTimeline = useMemo(() => generateMockImplementationTimeline(), []);
  const velocity = useMemo(() => generateMockDecisionVelocity(6), []);
  const recommendations = useMemo(() => generateMockRecommendations(), []);

  const filteredDecisions = useMemo(() => {
    return decisions.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (categoryFilter !== "all" && d.category !== categoryFilter)
        return false;
      if (impactFilter !== "all" && d.impact !== impactFilter) return false;
      return true;
    });
  }, [decisions, statusFilter, categoryFilter, impactFilter]);

  const resetFilters = () => {
    setStatusFilter("all");
    setCategoryFilter("all");
    setImpactFilter("all");
  };

  const totalImprovement = recommendations.reduce(
    (sum, r) => sum + r.estimatedImprovement,
    0,
  );

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 via-white to-slate-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12">
        {/* Header */}
        <section className="mb-6 sm:mb-8">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
            <div className="h-1 bg-linear-to-r from-blue-600 via-indigo-600 to-violet-600" />
            <div className="px-5 py-7 sm:px-8 sm:py-9">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30">
                    <GitBranch className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                      Decision Tracking
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-0.5">
                      Track, analyze, and optimize organizational
                      decision-making
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                    <Sparkles className="h-3.5 w-3.5" />
                    {recommendations.length} Insights
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Row */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6 sm:mb-8">
          <DecisionMetricCard
            icon={GitBranch}
            label="Total"
            value={stats.totalDecisions}
            subtitle="decisions tracked"
            color="#8b5cf6"
          />
          <DecisionMetricCard
            icon={CheckCircle}
            label="Implemented"
            value={stats.implementedCount}
            subtitle={`${stats.implementationRate.toFixed(0)}% rate`}
            color="#22c55e"
          />
          <DecisionMetricCard
            icon={Clock}
            label="Avg Time"
            value={`${stats.avgDaysToDecide.toFixed(0)}d`}
            subtitle="to decide"
            color="#0ea5e9"
          />
          <DecisionMetricCard
            icon={Target}
            label="Implement"
            value={`${stats.avgDaysToImplement.toFixed(0)}d`}
            subtitle="avg implementation"
            color="#f59e0b"
          />
          <DecisionMetricCard
            icon={TrendingUp}
            label="Confidence"
            value={`${(stats.avgConfidence * 100).toFixed(0)}%`}
            subtitle="avg decision confidence"
            color="#14b8a6"
          />
          <DecisionMetricCard
            icon={AlertTriangle}
            label="Pending"
            value={stats.pendingCount}
            subtitle="awaiting decision"
            color="#f97316"
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <DecisionTrendChart data={trend} />
              </div>
              <ApprovalFunnelChart stats={stats} />
            </div>
            <DecisionPipelineCard stats={stats} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CategoryBreakdownChart data={categoryData} />
              <ImpactAnalysisChart data={impactData} />
            </div>
          </div>
        )}

        {/* Tab: All Decisions */}
        {activeTab === "decisions" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-slate-200/80 dark:border-gray-700 shadow-sm">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium bg-slate-50 dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                {Object.values(DecisionStatus).map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium bg-slate-50 dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {Object.values(DecisionCategory).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={impactFilter}
                onChange={(e) => setImpactFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium bg-slate-50 dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Impacts</option>
                {Object.values(DecisionImpact).map((i) => (
                  <option key={i} value={i}>
                    {i}
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
                {filteredDecisions.length} decisions
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDecisions.map((decision) => (
                <DecisionCard key={decision.id} decision={decision} />
              ))}
            </div>
          </div>
        )}

        {/* Tab: Velocity */}
        {activeTab === "velocity" && (
          <div className="space-y-6">
            <DecisionVelocityChart data={velocity} />
            <ImplementationSpeedChart data={implTimeline} />
          </div>
        )}

        {/* Tab: Improvements */}
        {activeTab === "improvements" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-5">
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Decision Process Improvement: +{totalImprovement}%
                </h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-gray-400">
                AI identified {recommendations.length} opportunities to improve
                decision velocity, quality, and follow-through.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.map((rec) => (
                <DecisionRecommendationCard key={rec.id} recommendation={rec} />
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-gray-700 text-center">
          <p className="text-xs text-slate-400 dark:text-gray-500">
            Decision Tracking Dashboard · AI-Powered Insights · Organizational
            Intelligence
          </p>
        </div>
      </div>
    </div>
  );
};

export default DecisionTrackingDashboard;
