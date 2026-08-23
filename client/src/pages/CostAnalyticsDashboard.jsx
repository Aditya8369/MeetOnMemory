import React, { useState, useMemo } from "react";
import {
  DollarSign, TrendingUp, Users, Clock, Target,
  BarChart3, Lightbulb, Filter, RotateCcw, Download,
  Sparkles, ChevronDown, Building, Zap,
} from "lucide-react";
import {
  generateMockCostSummary, generateMockMonthlyCosts,
  generateMockDepartmentCosts, generateMockMeetingTypeCosts,
  generateMockMemberCosts, generateMockCostBreakdown,
  generateMockCostEfficiency, generateMockROIAnalysis,
  generateMockBudgetComparison, generateMockHourlyCostDistribution,
  generateMockCostRecommendations,
} from "./costAnalyticsData";
import {
  CostMetricCard, DepartmentCostCard, MemberCostCard,
  RecommendationCard, BudgetStatusCard,
} from "./CostAnalyticsCards";
import {
  MonthlyCostTrendChart, DepartmentCostBarChart,
  CostBreakdownPieChart, EfficiencyTrendChart,
  ROIAnalysisChart, HourlyCostDistributionChart,
  BudgetComparisonChart, MeetingTypeCostScatterChart,
} from "./CostAnalyticsCharts";

const TABS = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "departments", label: "Departments", icon: Building },
  { key: "members", label: "Team Costs", icon: Users },
  { key: "roi", label: "ROI Analysis", icon: Target },
  { key: "recommendations", label: "Savings", icon: Lightbulb },
];

/* ─── Cost Analytics Dashboard ─────────────────────────────────────── */
const CostAnalyticsDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedDept, setSelectedDept] = useState("all");

  // Data
  const summary = useMemo(() => generateMockCostSummary(), []);
  const monthlyCosts = useMemo(() => generateMockMonthlyCosts(8), []);
  const departments = useMemo(() => generateMockDepartmentCosts(), []);
  const meetingTypes = useMemo(() => generateMockMeetingTypeCosts(), []);
  const members = useMemo(() => generateMockMemberCosts(), []);
  const costBreakdown = useMemo(() => generateMockCostBreakdown(), []);
  const efficiency = useMemo(() => generateMockCostEfficiency(8), []);
  const roi = useMemo(() => generateMockROIAnalysis(), []);
  const budgetComparison = useMemo(() => generateMockBudgetComparison(), []);
  const hourlyDist = useMemo(() => generateMockHourlyCostDistribution(), []);
  const recommendations = useMemo(() => generateMockCostRecommendations(), []);

  const totalSavings = recommendations.reduce((sum, r) => sum + r.savings, 0);
  const costChange = ((summary.totalCostMonth - summary.totalCostLastMonth) / summary.totalCostLastMonth * 100).toFixed(1);

  const filteredDepartments = useMemo(() => {
    if (selectedDept === "all") return departments;
    return departments.filter((d) => d.department === selectedDept);
  }, [departments, selectedDept]);

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 via-white to-slate-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12">
        {/* Header */}
        <section className="mb-6 sm:mb-8">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
            <div className="h-1 bg-linear-to-r from-violet-600 via-blue-600 to-indigo-600" />
            <div className="px-5 py-7 sm:px-8 sm:py-9">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-900/30">
                    <DollarSign className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                      Meeting Cost Analytics
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-0.5">
                      Track, analyze, and optimize your organization's meeting investment
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                    <Sparkles className="h-3.5 w-3.5" />
                    {recommendations.length} Savings Tips
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Row */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6 sm:mb-8">
          <CostMetricCard icon={DollarSign} label="Total Cost" value={`$${(summary.totalCostMonth / 1000).toFixed(1)}k`} subtitle="this month" delta={costChange} color="#8b5cf6" />
          <CostMetricCard icon={BarChart3} label="Per Meeting" value={`$${summary.avgCostPerMeeting.toFixed(0)}`} subtitle="average cost" color="#0ea5e9" />
          <CostMetricCard icon={Users} label="Per Person" value={`$${summary.avgCostPerParticipant.toFixed(0)}`} subtitle="per participant" color="#22c55e" />
          <CostMetricCard icon={Clock} label="Hours" value={summary.totalParticipantHours.toFixed(0)} subtitle="participant hours" color="#f59e0b" />
          <CostMetricCard icon={Target} label="Efficiency" value={`${summary.budgetUtilization.toFixed(0)}%`} subtitle="budget utilization" color="#14b8a6" />
          <CostMetricCard icon={TrendingUp} label="Savings" value={`$${summary.savingsFromOptimization.toFixed(0)}`} subtitle="from optimization" delta={`-$${summary.savingsFromOptimization.toFixed(0)}`} color="#ec4899" />
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
                <MonthlyCostTrendChart data={monthlyCosts} />
              </div>
              <CostBreakdownPieChart data={costBreakdown} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <EfficiencyTrendChart data={efficiency} />
              <HourlyCostDistributionChart data={hourlyDist} />
            </div>
          </div>
        )}

        {/* Tab: Departments */}
        {activeTab === "departments" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="all">All Departments</option>
                {[...new Set(departments.map((d) => d.department))].map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDepartments.map((dept) => (
                <DepartmentCostCard key={dept.department} dept={dept} />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <DepartmentCostBarChart data={filteredDepartments} />
              <BudgetComparisonChart data={budgetComparison} />
            </div>
          </div>
        )}

        {/* Tab: Members */}
        {activeTab === "members" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {members.map((member) => (
                <MemberCostCard key={member.id} member={member} />
              ))}
            </div>
            <MeetingTypeCostScatterChart data={meetingTypes} />
          </div>
        )}

        {/* Tab: ROI */}
        {activeTab === "roi" && (
          <div className="space-y-6">
            <ROIAnalysisChart data={roi} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {roi.map((item) => (
                <div key={item.type} className={`rounded-xl border p-4 shadow-sm ${item.isProfitable ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10" : "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100">{item.type}</h3>
                    <span className={`text-lg font-bold ${item.isProfitable ? "text-emerald-600" : "text-red-500"}`}>{item.roi.toFixed(1)}x</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div><span className="text-slate-400">Investment:</span> <span className="font-semibold">${item.investment.toLocaleString()}</span></div>
                    <div><span className="text-slate-400">Outcomes:</span> <span className="font-semibold">${item.outcomes.toLocaleString()}</span></div>
                    <div><span className="text-slate-400">Decisions:</span> <span className="font-semibold">{item.decisionCount}</span></div>
                    <div><span className="text-slate-400">Actions:</span> <span className="font-semibold">{item.actionItemsGenerated}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Recommendations */}
        {activeTab === "recommendations" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-5">
              <div className="flex items-center gap-3 mb-2">
                <Lightbulb className="h-5 w-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Potential Savings: ${totalSavings.toLocaleString()}/month</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-gray-400">
                AI analysis identified {recommendations.length} opportunities to reduce meeting costs.
                Implementing all recommendations could save up to ${totalSavings.toLocaleString()} per month.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.map((rec) => (
                <RecommendationCard key={rec.id} recommendation={rec} />
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-gray-700 text-center">
          <p className="text-xs text-slate-400 dark:text-gray-500">
            Meeting Cost Analytics · AI-Powered Optimization · Cost tracking updated in real-time
          </p>
        </div>
      </div>
    </div>
  );
};

export default CostAnalyticsDashboard;
