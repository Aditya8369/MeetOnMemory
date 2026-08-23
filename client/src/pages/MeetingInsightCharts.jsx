import React from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ComposedChart, ScatterChart, Scatter,
} from "recharts";

const CHART_COLORS = ["#22c55e", "#8b5cf6", "#0ea5e9", "#f59e0b", "#ec4899", "#f97316", "#14b8a6", "#6366f1"];

/* ─── Attendance Trend Chart ───────────────────────────────────────── */
export function AttendanceTrendChart({ data }) {
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">Attendance Trend</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="attendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#9ca3af" }} />
          <YAxis domain={[50, 100]} tick={{ fontSize: 11, fill: "#9ca3af" }} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
          <Area type="monotone" dataKey="rate" stroke="#22c55e" strokeWidth={2.5} fill="url(#attendGrad)" name="Attendance %" />
          <Line type="monotone" dataKey="avgParticipants" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Avg Participants" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Meeting Type Breakdown ───────────────────────────────────────── */
export function MeetingTypeBreakdownChart({ data }) {
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">Meeting Types</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <YAxis dataKey="type" type="category" width={100} tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
          <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Sentiment Timeline ───────────────────────────────────────────── */
export function SentimentTimelineChart({ data }) {
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">Sentiment Over Time</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="negGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} interval={4} />
          <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="positive" stroke="#22c55e" fill="url(#posGrad)" name="Positive" />
          <Area type="monotone" dataKey="neutral" stroke="#6b7280" fill="transparent" name="Neutral" strokeDasharray="4 4" />
          <Area type="monotone" dataKey="negative" stroke="#ef4444" fill="url(#negGrad)" name="Negative" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Weekly Metrics Chart ─────────────────────────────────────────── */
export function WeeklyMetricsChart({ data }) {
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">Weekly Metrics</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          <Bar yAxisId="left" dataKey="meetingsHeld" fill="#22c55e" name="Meetings" radius={[4, 4, 0, 0]} />
          <Bar yAxisId="left" dataKey="decisionsMade" fill="#8b5cf6" name="Decisions" radius={[4, 4, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="avgSentiment" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} name="Sentiment" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Engagement Radar ─────────────────────────────────────────────── */
export function EngagementRadarChart({ data }) {
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">Team Engagement Radar</h3>
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={data}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} />
          <PolarRadiusAxis tick={{ fontSize: 9, fill: "#9ca3af" }} />
          <Radar name="Engagement" dataKey="engagementScore" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} strokeWidth={2} />
          <Radar name="Speaking Time" dataKey="speakingTimePercent" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} strokeWidth={2} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Efficiency Bar Chart ─────────────────────────────────────────── */
export function EfficiencyBarChart({ data }) {
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">Meeting Efficiency by Type</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="type" tick={{ fontSize: 9, fill: "#9ca3af" }} angle={-30} textAnchor="end" height={60} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="efficiency" name="Efficiency" fill="#22c55e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="agendaAdherence" name="Agenda Adherence" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
          <Bar dataKey="followUpRate" name="Follow-up Rate" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Action Items Donut ───────────────────────────────────────────── */
export function ActionItemsDonutChart({ stats }) {
  const pieData = [
    { name: "Completed", value: stats.completed, color: "#22c55e" },
    { name: "In Progress", value: stats.inProgress, color: "#f59e0b" },
    { name: "Overdue", value: stats.overdue, color: "#ef4444" },
  ];

  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">Action Item Distribution</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
            {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Cost Trend Chart ─────────────────────────────────────────────── */
export function CostTrendChart({ data }) {
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">Meeting Cost Trend</h3>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} formatter={(v) => [`$${v.toLocaleString()}`, "Cost"]} />
          <Area type="monotone" dataKey="costUsd" stroke="#6366f1" strokeWidth={2.5} fill="url(#costGrad)" name="Cost ($)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
