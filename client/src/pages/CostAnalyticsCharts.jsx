import React from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ComposedChart, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter,
} from "recharts";

const COLORS = ["#8b5cf6", "#0ea5e9", "#22c55e", "#f59e0b", "#ec4899", "#f97316", "#6b7280"];

/* ─── Monthly Cost Trend ───────────────────────────────────────────── */
export function MonthlyCostTrendChart({ data }) {
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">Monthly Cost Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data}>
          <defs>
            <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} formatter={(v) => [`$${v.toLocaleString()}`, ""]} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="totalCost" stroke="#8b5cf6" fill="url(#costGrad)" name="Total Cost" strokeWidth={2.5} />
          <Bar dataKey="salaryCost" fill="#0ea5e9" name="Salary" radius={[2, 2, 0, 0]} barSize={20} />
          <Line type="monotone" dataKey="toolsCost" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="Tools" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Department Cost Bar ──────────────────────────────────────────── */
export function DepartmentCostBarChart({ data }) {
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">Cost by Department</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
          <YAxis dataKey="department" type="category" width={90} tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} formatter={(v) => [`$${v.toLocaleString()}`, "Cost"]} />
          <Bar dataKey="totalCost" name="Total Cost" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Cost Breakdown Pie ───────────────────────────────────────────── */
export function CostBreakdownPieChart({ data }) {
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">Cost Breakdown</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" outerRadius={100} innerRadius={50} paddingAngle={2} dataKey="amount" nameKey="label">
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} formatter={(v) => [`$${v.toLocaleString()}`, ""]} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Efficiency Trend ─────────────────────────────────────────────── */
export function EfficiencyTrendChart({ data }) {
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">Efficiency Score Trend</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="effGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
          <Area type="monotone" dataKey="efficiencyScore" stroke="#22c55e" fill="url(#effGrad)" name="Efficiency" strokeWidth={2.5} />
          <Line type="monotone" dataKey="onTimeStartRate" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="On-Time Start %" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── ROI Analysis ─────────────────────────────────────────────────── */
export function ROIAnalysisChart({ data }) {
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">ROI by Meeting Type</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="type" tick={{ fontSize: 9, fill: "#9ca3af" }} angle={-30} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="investment" fill="#8b5cf6" name="Investment" radius={[4, 4, 0, 0]} />
          <Bar dataKey="outcomes" fill="#22c55e" name="Outcomes" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Hourly Distribution ──────────────────────────────────────────── */
export function HourlyCostDistributionChart({ data }) {
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">Hourly Cost Distribution</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#9ca3af" }} interval={2} />
          <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} formatter={(v) => [`$${v.toLocaleString()}`, "Total Cost"]} />
          <Bar dataKey="totalCost" fill="#6366f1" name="Total Cost" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Budget Comparison ────────────────────────────────────────────── */
export function BudgetComparisonChart({ data }) {
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">Budget vs Actual</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="department" tick={{ fontSize: 9, fill: "#9ca3af" }} angle={-20} textAnchor="end" height={50} />
          <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} formatter={(v) => [`$${v.toLocaleString()}`, ""]} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="budget" fill="#d1d5db" name="Budget" radius={[4, 4, 0, 0]} />
          <Bar dataKey="actual" fill="#8b5cf6" name="Actual" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Meeting Type Cost Scatter ────────────────────────────────────── */
export function MeetingTypeCostScatterChart({ data }) {
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">Duration vs Cost</h3>
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="avgDuration" name="Duration (min)" tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <YAxis dataKey="avgCostPerMeeting" name="Cost ($)" tick={{ fontSize: 10, fill: "#9ca3af" }} tickFormatter={(v) => `$${v}`} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
          <Scatter data={data} fill="#8b5cf6" name="Meeting Types" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
