import React from "react";
import {
  DollarSign, TrendingUp, TrendingDown, Minus, Users,
  Clock, Target, Zap, AlertTriangle, CheckCircle,
  ChevronRight, Lightbulb, ArrowDownRight, ArrowUpRight,
} from "lucide-react";

/* ─── Metric Card ──────────────────────────────────────────────────── */
export function CostMetricCard({ icon: Icon, label, value, subtitle, delta, deltaPrefix = "", color = "#22c55e" }) {
  const isPositive = delta && (typeof delta === "string" ? delta.startsWith("-") : delta < 0);
  const deltaColor = isPositive ? "text-emerald-600" : delta ? "text-red-500" : "";

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white leading-tight">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">{subtitle}</p>}
          {delta !== undefined && delta !== null && (
            <p className={`mt-1 text-xs font-semibold flex items-center gap-1 ${deltaColor}`}>
              {isPositive ? <ArrowDownRight className="h-3 w-3" /> : delta ? <ArrowUpRight className="h-3 w-3" /> : null}
              {deltaPrefix}{typeof delta === "number" ? `${delta > 0 ? "+" : ""}${delta}%` : delta}
            </p>
          )}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}15` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Department Cost Card ─────────────────────────────────────────── */
export function DepartmentCostCard({ dept }) {
  const trendIcon = dept.trend === "decreasing" ? TrendingDown
    : dept.trend === "increasing" ? TrendingUp : Minus;
  const trendColor = dept.trend === "decreasing" ? "text-emerald-500"
    : dept.trend === "increasing" ? "text-red-500" : "text-gray-400";
  const TrendIcon = trendIcon;

  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100">{dept.department}</h3>
        <div className="flex items-center gap-1">
          <TrendIcon className={`h-4 w-4 ${trendColor}`} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="text-center p-2 bg-slate-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-lg font-bold text-slate-900 dark:text-white">${dept.totalCost.toLocaleString()}</p>
          <p className="text-[9px] text-slate-400 uppercase">Total Cost</p>
        </div>
        <div className="text-center p-2 bg-slate-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-lg font-bold text-slate-900 dark:text-white">{dept.meetingCount}</p>
          <p className="text-[9px] text-slate-400 uppercase">Meetings</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>${dept.avgCostPerMeeting}/meeting avg</span>
        <span>{dept.costEfficiency}% efficient</span>
      </div>
      <div className="mt-2 w-full h-1.5 bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${dept.costEfficiency}%` }} />
      </div>
    </div>
  );
}

/* ─── Member Cost Card ─────────────────────────────────────────────── */
export function MemberCostCard({ member }) {
  const reductionColor = member.recommendedReduction > 15 ? "text-red-500"
    : member.recommendedReduction > 5 ? "text-amber-500" : "text-emerald-500";

  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-violet-500 text-white text-sm font-bold">
          {member.name.split(" ").map((n) => n[0]).join("")}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-gray-100 truncate">{member.name}</p>
          <p className="text-[11px] text-slate-500 dark:text-gray-400">{member.role} · ${member.hourlyRate}/hr</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="text-center p-1.5 bg-slate-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-sm font-bold text-slate-900 dark:text-white">${member.totalMeetingCost.toLocaleString()}</p>
          <p className="text-[8px] text-slate-400 uppercase">Total Cost</p>
        </div>
        <div className="text-center p-1.5 bg-slate-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-sm font-bold text-slate-900 dark:text-white">{member.meetingsAttended}</p>
          <p className="text-[8px] text-slate-400 uppercase">Meetings</p>
        </div>
        <div className="text-center p-1.5 bg-slate-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-sm font-bold text-slate-900 dark:text-white">{member.totalMeetingHours}h</p>
          <p className="text-[8px] text-slate-400 uppercase">Hours</p>
        </div>
      </div>
      {member.recommendedReduction > 0 && (
        <div className="flex items-center gap-1.5 text-[10px]">
          <AlertTriangle className={`h-3 w-3 ${reductionColor}`} />
          <span className={reductionColor}>Reduce {member.recommendedReduction}% meeting time</span>
        </div>
      )}
    </div>
  );
}

/* ─── Recommendation Card ──────────────────────────────────────────── */
export function RecommendationCard({ recommendation }) {
  const impactColors = {
    high: { bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800" },
    medium: { bg: "bg-amber-50 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800" },
    low: { bg: "bg-sky-50 dark:bg-sky-900/30", text: "text-sky-700 dark:text-sky-300", border: "border-sky-200 dark:border-sky-800" },
  };
  const colors = impactColors[recommendation.impact] || impactColors.low;

  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-900/30">
            <Lightbulb className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100">{recommendation.title}</h3>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${colors.bg} ${colors.text} border ${colors.border}`}>
          {recommendation.impact}
        </span>
      </div>
      <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed mb-3">{recommendation.description}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-emerald-600">${recommendation.savings.toLocaleString()}</span>
          <span className="text-[10px] text-slate-400">/month savings</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-gray-700 rounded">{recommendation.category}</span>
          <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-gray-700 rounded">{recommendation.effort} effort</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Budget Status Card ───────────────────────────────────────────── */
export function BudgetStatusCard({ budget, actual }) {
  const utilization = Math.round((actual / budget) * 100);
  const variance = budget - actual;
  const color = utilization > 90 ? "#ef4444" : utilization > 75 ? "#f59e0b" : "#22c55e";

  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100">Budget Status</h3>
        <span className="text-lg font-bold" style={{ color }}>{utilization}%</span>
      </div>
      <div className="w-full h-3 bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(utilization, 100)}%`, backgroundColor: color }} />
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-2 bg-slate-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-slate-500">Budget</p>
          <p className="font-bold text-slate-900 dark:text-white">${budget.toLocaleString()}</p>
        </div>
        <div className="p-2 bg-slate-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-slate-500">Actual</p>
          <p className="font-bold text-slate-900 dark:text-white">${actual.toLocaleString()}</p>
        </div>
        <div className="col-span-2 p-2 bg-slate-50 dark:bg-gray-700/50 rounded-lg text-center">
          <p className="text-slate-500">Variance</p>
          <p className={`font-bold ${variance >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {variance >= 0 ? "+" : ""}${variance.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
