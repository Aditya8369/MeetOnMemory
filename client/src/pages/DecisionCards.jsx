import React from "react";
import {
  Lightbulb, Eye, CheckCircle, Rocket, XCircle, RotateCcw,
  Layers, GitBranch, Wrench, UserPlus, Target, DollarSign,
  Shield, Code, TrendingUp, Clock, Users, AlertTriangle,
  ChevronRight, Sparkles, BarChart3, Zap,
} from "lucide-react";
import { STATUS_CONFIG, IMPACT_CONFIG, CATEGORY_CONFIG, DecisionStatus } from "./decisionTypes";

const ICON_MAP = {
  Lightbulb, Eye, CheckCircle, Rocket, XCircle, RotateCcw,
  Layers, GitBranch, Wrench, UserPlus, Target, DollarSign,
  Shield, Code, TrendingUp, Clock, Users, AlertTriangle,
  ChevronRight, Sparkles, BarChart3, Zap,
};

/* ─── Metric Card ──────────────────────────────────────────────────── */
export function DecisionMetricCard({ icon: Icon, label, value, subtitle, color = "#22c55e" }) {
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white leading-tight">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">{subtitle}</p>}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}15` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Decision Card ────────────────────────────────────────────────── */
export function DecisionCard({ decision }) {
  const statusConfig = STATUS_CONFIG[decision.status] || {};
  const impactConfig = IMPACT_CONFIG[decision.impact] || {};
  const catConfig = CATEGORY_CONFIG[decision.category] || {};
  const StatusIcon = ICON_MAP[statusConfig.icon] || Lightbulb;
  const CatIcon = ICON_MAP[catConfig.icon] || Zap;

  const votePercent = decision.votesFor + decision.votesAgainst > 0
    ? Math.round((decision.votesFor / (decision.votesFor + decision.votesAgainst)) * 100)
    : 0;

  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${statusConfig.bgColor || "bg-gray-50"}`}>
            <StatusIcon className={`h-4 w-4 ${statusConfig.textColor || "text-gray-500"}`} />
          </div>
          <div>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase ${statusConfig.bgColor} ${statusConfig.textColor}`}>
              {statusConfig.label}
            </span>
            <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase ${impactConfig.bgColor} ${impactConfig.textColor}`}>
              {impactConfig.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <CatIcon className="h-3.5 w-3.5" style={{ color: catConfig.color }} />
          <span className="text-[10px] text-slate-400">{catConfig.label}</span>
        </div>
      </div>

      {/* Title & Description */}
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-1">{decision.title}</h3>
      <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed line-clamp-2 mb-3">{decision.description}</p>

      {/* Stats Row */}
      <div className="flex items-center gap-4 text-[10px] text-slate-400 mb-2">
        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{decision.participants}</span>
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{decision.meetingCount} meetings</span>
        <span className="flex items-center gap-1">📅 {new Date(decision.decidedAt).toLocaleDateString()}</span>
      </div>

      {/* Vote Bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="text-emerald-500 font-semibold">{decision.votesFor} for</span>
          <span className="text-red-400">{decision.votesAgainst} against</span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${votePercent}%` }} />
          <div className="h-full bg-red-400 rounded-full" style={{ width: `${100 - votePercent}%` }} />
        </div>
      </div>

      {/* Follow-up */}
      <div className="flex items-center justify-between text-[10px] text-slate-400">
        <span>Follow-ups: {decision.completedActions}/{decision.followUpActions}</span>
        {decision.implementationDays && (
          <span className="text-emerald-500 font-semibold">Implemented in {decision.implementationDays}d</span>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mt-2">
        {decision.tags.map((tag) => (
          <span key={tag} className="px-1.5 py-0.5 bg-slate-100 dark:bg-gray-700 text-[9px] text-slate-500 rounded">{tag}</span>
        ))}
      </div>
    </div>
  );
}

/* ─── Recommendation Card ──────────────────────────────────────────── */
export function DecisionRecommendationCard({ recommendation }) {
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
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-violet-600">+{recommendation.estimatedImprovement}%</span>
          <span className="text-[10px] text-slate-400">improvement</span>
        </div>
        <span className="px-1.5 py-0.5 text-[10px] bg-slate-100 dark:bg-gray-700 rounded text-slate-500">{recommendation.category}</span>
      </div>
    </div>
  );
}

/* ─── Pipeline Card ────────────────────────────────────────────────── */
export function DecisionPipelineCard({ stats }) {
  const pipeline = [
    { label: 'Proposed', count: stats.pendingCount, color: '#6b7280' },
    { label: 'Approved', count: Math.floor(stats.totalDecisions * 0.15), color: '#0ea5e9' },
    { label: 'Implementing', count: Math.floor(stats.totalDecisions * 0.1), color: '#f59e0b' },
    { label: 'Done', count: stats.implementedCount, color: '#22c55e' },
  ];

  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-4">Decision Pipeline</h3>
      <div className="flex items-center gap-2">
        {pipeline.map((stage, i) => {
          const total = pipeline.reduce((s, p) => s + p.count, 0);
          const width = (stage.count / total) * 100;
          return (
            <React.Fragment key={stage.label}>
              <div className="flex-1 text-center">
                <div className="text-lg font-bold" style={{ color: stage.color }}>{stage.count}</div>
                <div className="text-[9px] text-slate-400 uppercase">{stage.label}</div>
              </div>
              {i < pipeline.length - 1 && <ChevronRight className="h-4 w-4 text-slate-300" />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
