import React from "react";
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ComposedChart, RadialBarChart, RadialBar,
  PieChart, Pie, Cell,
} from "recharts";

const COLORS = ["#22c55e", "#0ea5e9", "#8b5cf6", "#f59e0b", "#ec4899", "#f97316", "#14b8a6", "#6366f1"];

/* ─── Health Trend Chart ───────────────────────────────────────────── */
export function HealthTrendChart({ data }) {
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">Health Score Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="healthGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <YAxis domain={[30, 100]} tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="overall" stroke="#22c55e" fill="url(#healthGrad)" name="Overall" strokeWidth={2.5} />
          <Line type="monotone" dataKey="attendance" stroke="#0ea5e9" strokeWidth={2} dot={false} name="Attendance" />
          <Line type="monotone" dataKey="punctuality" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Punctuality" />
          <Line type="monotone" dataKey="engagement" stroke="#f59e0b" strokeWidth={2} dot={false} name="Engagement" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Team Comparison Bar ──────────────────────────────────────────── */
export function TeamComparisonBarChart({ data }) {
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">Team Health Comparison</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="team" tick={{ fontSize: 9, fill: "#9ca3af" }} angle={-20} textAnchor="end" height={50} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="overallScore" name="Overall" fill="#22c55e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="engagementScore" name="Engagement" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="followUpRate" name="Follow-up" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Metric Radar Chart ───────────────────────────────────────────── */
export function MetricRadarChart({ scores }) {
  const radarData = scores.map((s) => ({
    metric: s.metric.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    score: s.score,
    target: 80,
  }));

  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">Health Metrics Radar</h3>
      <ResponsiveContainer width="100%" height={350}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 9, fill: "#6b7280" }} />
          <PolarRadiusAxis tick={{ fontSize: 9, fill: "#9ca3af" }} domain={[0, 100]} />
          <Radar name="Score" dataKey="score" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} strokeWidth={2} />
          <Radar name="Target" dataKey="target" stroke="#d1d5db" fill="transparent" strokeDasharray="4 4" strokeWidth={1.5} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Issue Severity Pie ───────────────────────────────────────────── */
export function IssueSeverityPieChart({ issues }) {
  const severityCounts = {};
  issues.forEach((issue) => {
    severityCounts[issue.severity] = (severityCounts[issue.severity] || 0) + 1;
  });

  const pieData = Object.entries(severityCounts).map(([severity, count]) => ({
    name: severity.charAt(0).toUpperCase() + severity.slice(1),
    value: count,
  }));

  const pieColors = { Info: "#0ea5e9", Warning: "#f59e0b", Error: "#f97316", Critical: "#ef4444" };

  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">Issues by Severity</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
            {pieData.map((entry, i) => <Cell key={i} fill={pieColors[entry.name] || COLORS[i]} />)}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Meeting Type Health Bar ──────────────────────────────────────── */
export function MeetingTypeHealthBarChart({ data }) {
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">Health by Meeting Type</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <YAxis dataKey="type" type="category" width={100} tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="healthScore" name="Health Score" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.healthScore >= 85 ? "#22c55e" : entry.healthScore >= 70 ? "#0ea5e9" : entry.healthScore >= 50 ? "#f59e0b" : "#ef4444"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Issue Trend Chart ────────────────────────────────────────────── */
export function IssueTrendChart({ issues }) {
  const dailyData = {};
  issues.forEach((issue) => {
    const date = new Date(issue.createdAt).toISOString().split('T')[0];
    if (!dailyData[date]) dailyData[date] = { date, total: 0, critical: 0, resolved: 0 };
    dailyData[date].total++;
    if (issue.severity === 'critical' || issue.severity === 'error') dailyData[date].critical++;
    if (issue.isResolved) dailyData[date].resolved++;
  });

  const chartData = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">Issue Trend</h3>
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#9ca3af" }} />
          <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="total" name="Total Issues" fill="#d1d5db" radius={[4, 4, 0, 0]} />
          <Bar dataKey="critical" name="Critical/Error" fill="#ef4444" radius={[4, 4, 0, 0]} />
          <Line type="monotone" dataKey="resolved" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="Resolved" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
