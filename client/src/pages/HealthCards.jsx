import React from "react";
import {
  Users,
  Clock,
  FileText,
  Timer,
  ArrowRight,
  MessageSquare,
  CheckCircle,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  AlertOctagon,
  Info,
  Zap,
  Lightbulb,
  ChevronRight,
  Shield,
} from "lucide-react";
import {
  STATUS_CONFIG,
  SEVERITY_CONFIG,
  METRIC_CONFIG,
  HealthStatus,
  IssueSeverity,
  TrendDirection,
} from "./healthTypes";

const ICON_MAP = {
  Users,
  Clock,
  FileText,
  Timer,
  ArrowRight,
  MessageSquare,
  CheckCircle,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  AlertOctagon,
  Info,
  Zap,
  Lightbulb,
  ChevronRight,
  Shield,
};

/* ─── Health Score Ring ────────────────────────────────────────────── */
export function HealthScoreRing({
  score,
  size = 120,
  label = "Overall Health",
}) {
  const status =
    score >= 85
      ? HealthStatus.EXCELLENT
      : score >= 70
        ? HealthStatus.GOOD
        : score >= 50
          ? HealthStatus.FAIR
          : score >= 30
            ? HealthStatus.POOR
            : HealthStatus.CRITICAL;
  const config = STATUS_CONFIG[status];
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
            className="dark:stroke-gray-700"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={config.color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-slate-900 dark:text-white">
            {score}
          </span>
          <span className={`text-xs font-semibold ${config.textColor}`}>
            {config.emoji} {config.label}
          </span>
        </div>
      </div>
      <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-gray-400">
        {label}
      </p>
    </div>
  );
}

/* ─── Metric Score Card ────────────────────────────────────────────── */
export function MetricScoreCard({ healthScore }) {
  const config = METRIC_CONFIG[healthScore.metric] || {};
  const statusConfig = STATUS_CONFIG[healthScore.status] || {};
  const Icon = ICON_MAP[config.icon] || Zap;
  const TrendIcon =
    healthScore.trend === TrendDirection.IMPROVING
      ? TrendingUp
      : healthScore.trend === TrendDirection.DECLINING
        ? TrendingDown
        : Minus;
  const trendColor =
    healthScore.trend === TrendDirection.IMPROVING
      ? "text-emerald-500"
      : healthScore.trend === TrendDirection.DECLINING
        ? "text-red-500"
        : "text-gray-400";

  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${statusConfig.bgColor || "bg-gray-50"}`}
          >
            <Icon
              className={`h-4.5 w-4.5 ${statusConfig.textColor || "text-gray-500"}`}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-gray-100">
              {config.label || healthScore.metric}
            </p>
            <p className="text-[10px] text-slate-400">
              Target: {config.target}
              {config.unit}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendIcon className={`h-4 w-4 ${trendColor}`} />
          <span className={`text-xs font-bold ${trendColor}`}>
            {healthScore.changePercent > 0 ? "+" : ""}
            {healthScore.changePercent}%
          </span>
        </div>
      </div>

      {/* Score Bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className={`${statusConfig.textColor} font-semibold`}>
            {healthScore.score}/100
          </span>
          <span className="text-slate-400">{statusConfig.label}</span>
        </div>
        <div className="w-full h-2 bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${healthScore.score}%`,
              backgroundColor: statusConfig.color,
            }}
          />
        </div>
      </div>

      <p className="text-[10px] text-slate-400 dark:text-gray-500 line-clamp-2">
        {config.description}
      </p>
    </div>
  );
}

/* ─── Issue Card ───────────────────────────────────────────────────── */
export function IssueCard({ issue }) {
  const sevConfig = SEVERITY_CONFIG[issue.severity] || {};
  const SevIcon = ICON_MAP[sevConfig.icon] || Info;

  return (
    <div
      className={`rounded-xl border ${sevConfig.bgColor || "bg-white"} border-slate-200/80 dark:border-gray-700 p-4 shadow-sm ${issue.isResolved ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${sevConfig.bgColor}`}
          >
            <SevIcon className={`h-4 w-4 ${sevConfig.textColor}`} />
          </div>
          <div>
            <span
              className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase ${sevConfig.bgColor} ${sevConfig.textColor}`}
            >
              {sevConfig.label}
            </span>
          </div>
        </div>
        {issue.isResolved && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
            Resolved
          </span>
        )}
      </div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-1">
        {issue.title}
      </h3>
      <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed mb-2">
        {issue.description}
      </p>
      <div className="flex items-center gap-3 text-[10px] text-slate-400">
        <span>📍 {issue.team}</span>
        <span>👤 {issue.assignedTo}</span>
        <span>📅 {new Date(issue.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

/* ─── Team Health Card ─────────────────────────────────────────────── */
export function TeamHealthCard({ team }) {
  const scoreColor =
    team.overallScore >= 85
      ? "text-emerald-600"
      : team.overallScore >= 70
        ? "text-sky-600"
        : team.overallScore >= 50
          ? "text-amber-600"
          : "text-red-500";
  const TrendIcon =
    team.trend === TrendDirection.IMPROVING
      ? TrendingUp
      : team.trend === TrendDirection.DECLINING
        ? TrendingDown
        : Minus;
  const trendColor =
    team.trend === TrendDirection.IMPROVING
      ? "text-emerald-500"
      : team.trend === TrendDirection.DECLINING
        ? "text-red-500"
        : "text-gray-400";

  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100">
          {team.team}
        </h3>
        <div className="flex items-center gap-2">
          <TrendIcon className={`h-4 w-4 ${trendColor}`} />
          <span className={`text-lg font-bold ${scoreColor}`}>
            {team.overallScore}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center p-2 bg-slate-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {team.attendanceRate.toFixed(0)}%
          </p>
          <p className="text-[8px] text-slate-400 uppercase">Attendance</p>
        </div>
        <div className="text-center p-2 bg-slate-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {team.engagementScore.toFixed(0)}
          </p>
          <p className="text-[8px] text-slate-400 uppercase">Engagement</p>
        </div>
        <div className="text-center p-2 bg-slate-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {team.followUpRate.toFixed(0)}%
          </p>
          <p className="text-[8px] text-slate-400 uppercase">Follow-up</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px] text-slate-400">
        <span>{team.meetingLoad}h/week avg</span>
        {team.issuesCount > 0 && (
          <span className="text-amber-500 font-semibold">
            {team.issuesCount} issues
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Insight Card ─────────────────────────────────────────────────── */
export function InsightCard({ insight }) {
  const impactColors = {
    high: {
      bg: "bg-emerald-50 dark:bg-emerald-900/30",
      text: "text-emerald-700 dark:text-emerald-300",
      border: "border-emerald-200 dark:border-emerald-800",
    },
    medium: {
      bg: "bg-amber-50 dark:bg-amber-900/30",
      text: "text-amber-700 dark:text-amber-300",
      border: "border-amber-200 dark:border-amber-800",
    },
    low: {
      bg: "bg-sky-50 dark:bg-sky-900/30",
      text: "text-sky-700 dark:text-sky-300",
      border: "border-sky-200 dark:border-sky-800",
    },
  };
  const colors = impactColors[insight.impact] || impactColors.low;

  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-900/30">
            <Lightbulb className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100">
            {insight.title}
          </h3>
        </div>
        <span
          className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${colors.bg} ${colors.text} border ${colors.border}`}
        >
          {insight.impact}
        </span>
      </div>
      <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed mb-3">
        {insight.description}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-violet-600">
            +{insight.estimatedImprovement}%
          </span>
          <span className="text-[10px] text-slate-400">improvement</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-gray-700 rounded">
            {insight.category}
          </span>
          <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-gray-700 rounded">
            {insight.effort} effort
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Meeting Type Health Card ─────────────────────────────────────── */
export function MeetingTypeHealthCard({ detail }) {
  const scoreColor =
    detail.healthScore >= 85
      ? "#22c55e"
      : detail.healthScore >= 70
        ? "#0ea5e9"
        : detail.healthScore >= 50
          ? "#f59e0b"
          : "#ef4444";

  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100">
          {detail.type}
        </h3>
        <span className="text-lg font-bold" style={{ color: scoreColor }}>
          {detail.healthScore}
        </span>
      </div>
      <div className="space-y-2">
        {[
          { label: "Attendance", value: detail.attendanceRate },
          { label: "Punctuality", value: detail.punctualityRate },
          { label: "Agenda", value: detail.agendaCompliance },
          { label: "Engagement", value: detail.engagementScore },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 w-16">
              {item.label}
            </span>
            <div className="flex-1 h-1.5 bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${item.value}%`, backgroundColor: scoreColor }}
              />
            </div>
            <span className="text-[10px] text-slate-500 w-8 text-right">
              {item.value.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
        <span>{detail.meetingCount} meetings</span>
        <span>{detail.issuesFound} issues</span>
      </div>
    </div>
  );
}
