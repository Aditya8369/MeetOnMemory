import React from "react";
import {
  Users,
  MessageSquare,
  CheckCircle,
  ListTodo,
  Heart,
  DollarSign,
  ArrowRight,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  AlertOctagon,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  CATEGORY_CONFIG,
  SEVERITY_CONFIG,
  InsightSeverity,
  TrendDirection,
} from "./meetingInsightsTypes";

const ICON_MAP = {
  Users,
  MessageSquare,
  CheckCircle,
  ListTodo,
  Heart,
  DollarSign,
  ArrowRight,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  AlertOctagon,
};

/* ─── Metric Card ──────────────────────────────────────────────────── */
export function MetricCard({
  icon: Icon,
  label,
  value,
  subtitle,
  delta,
  deltaColor = "normal",
  color = "#22c55e",
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white leading-tight">
            {value}
          </p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
          {delta && (
            <p
              className={`mt-1 text-xs font-semibold ${deltaColor === "normal" ? "text-emerald-600" : "text-red-500"}`}
            >
              {delta}
            </p>
          )}
        </div>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Insight Card ─────────────────────────────────────────────────── */
export function InsightCard({ insight }) {
  const catConfig = CATEGORY_CONFIG[insight.category] || {};
  const sevConfig = SEVERITY_CONFIG[insight.severity] || {};
  const CatIcon = ICON_MAP[catConfig.icon] || Zap;
  const SevIcon = ICON_MAP[sevConfig.icon] || Minus;
  const TrendIcon =
    insight.trend === TrendDirection.IMPROVING
      ? TrendingUp
      : insight.trend === TrendDirection.DECLINING
        ? TrendingDown
        : Minus;
  const trendColor =
    insight.trend === TrendDirection.IMPROVING
      ? "text-emerald-500"
      : insight.trend === TrendDirection.DECLINING
        ? "text-red-500"
        : "text-gray-400";

  return (
    <div
      className={`group relative rounded-xl border ${catConfig.borderColor || "border-slate-200 dark:border-gray-700"} bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden`}
    >
      <div
        className="h-1"
        style={{
          background: `linear-gradient(90deg, ${catConfig.color || "#6b7280"}, ${catConfig.color || "#6b7280"}88)`,
        }}
      />
      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${catConfig.bgColor || "bg-gray-50"}`}
            >
              <CatIcon
                className={`h-4.5 w-4.5 ${catConfig.textColor || "text-gray-500"}`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${catConfig.tagColor || ""}`}
                >
                  {catConfig.label || insight.category}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${sevConfig.bgColor || ""} ${sevConfig.textColor || ""}`}
                >
                  <SevIcon className="h-3 w-3" />
                  {sevConfig.label || insight.severity}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendIcon className={`h-4 w-4 ${trendColor}`} />
            <span className={`text-xs font-bold ${trendColor}`}>
              {insight.changePercent > 0 ? "+" : ""}
              {insight.changePercent}%
            </span>
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="text-base font-semibold text-slate-900 dark:text-gray-100 mb-1.5">
          {insight.title}
        </h3>
        <p className="text-sm leading-relaxed text-slate-500 dark:text-gray-400 line-clamp-3">
          {insight.description}
        </p>

        {/* Value Display */}
        <div className="mt-3 flex items-center gap-4">
          <div className="flex items-baseline gap-1">
            <span
              className="text-xl font-bold"
              style={{ color: catConfig.color }}
            >
              {insight.value}
            </span>
            <span className="text-xs text-slate-400 dark:text-gray-500">
              {insight.unit}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-gray-500">
            <Sparkles className="h-3 w-3" />
            <span>
              {insight.confidence
                ? `${Math.round(insight.confidence * 100)}% confidence`
                : "AI Insight"}
            </span>
          </div>
        </div>

        {/* Actions */}
        {insight.recommendedActions &&
          insight.recommendedActions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-gray-700">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500 mb-2">
                Recommended Actions
              </p>
              <div className="space-y-1.5">
                {insight.recommendedActions.slice(0, 2).map((action, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-xs text-slate-600 dark:text-gray-300"
                  >
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-400" />
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}

/* ─── Member Card ──────────────────────────────────────────────────── */
export function MemberCard({ member }) {
  const scoreColor =
    member.engagementScore >= 80
      ? "text-emerald-600"
      : member.engagementScore >= 60
        ? "text-amber-600"
        : "text-red-500";

  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-violet-500 text-white text-sm font-bold">
          {member.avatar}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-gray-100 truncate">
            {member.name}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-gray-400">
            {member.role}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold ${scoreColor}`}>
            {member.engagementScore}
          </p>
          <p className="text-[10px] text-slate-400 uppercase">Score</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 bg-slate-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {member.meetingsAttended}
          </p>
          <p className="text-[9px] text-slate-400 uppercase">Meetings</p>
        </div>
        <div className="text-center p-2 bg-slate-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {member.speakingTimePercent}%
          </p>
          <p className="text-[9px] text-slate-400 uppercase">Speaking</p>
        </div>
        <div className="text-center p-2 bg-slate-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {member.actionItemsCompleted}
          </p>
          <p className="text-[9px] text-slate-400 uppercase">Actions</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Action Item Stat Card ────────────────────────────────────────── */
export function ActionItemStatCard({ stats }) {
  const completionRate = stats.completionRate;
  const rateColor =
    completionRate >= 80
      ? "#22c55e"
      : completionRate >= 60
        ? "#f59e0b"
        : "#ef4444";

  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-4">
        Action Item Overview
      </h3>
      <div className="relative mb-4">
        <svg className="w-32 h-32 mx-auto" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="10"
          />
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke={rateColor}
            strokeWidth="10"
            strokeDasharray={`${completionRate * 3.14} ${314 - completionRate * 3.14}`}
            strokeDashoffset="78.5"
            strokeLinecap="round"
            className="transition-all duration-700"
          />
          <text
            x="60"
            y="55"
            textAnchor="middle"
            className="text-2xl font-bold fill-slate-900 dark:fill-white"
          >
            {completionRate}%
          </text>
          <text
            x="60"
            y="72"
            textAnchor="middle"
            className="text-[10px] fill-slate-400"
          >
            Completion
          </text>
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
          <p className="text-lg font-bold text-emerald-600">
            {stats.completed}
          </p>
          <p className="text-[10px] text-slate-500">Completed</p>
        </div>
        <div className="text-center p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <p className="text-lg font-bold text-amber-600">{stats.inProgress}</p>
          <p className="text-[10px] text-slate-500">In Progress</p>
        </div>
        <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-lg font-bold text-red-500">{stats.overdue}</p>
          <p className="text-[10px] text-slate-500">Overdue</p>
        </div>
        <div className="text-center p-2 bg-slate-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {stats.avgCompletionDays}
          </p>
          <p className="text-[10px] text-slate-500">Avg Days</p>
        </div>
      </div>
    </div>
  );
}
