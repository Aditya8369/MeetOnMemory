import React from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ComposedChart, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { CATEGORY_CONFIG, DecisionCategory, IMPACT_CONFIG, DecisionImpact } from "./decisionTypes";

const COLORS = ["#8b5cf6", "#0ea5e9", "#22c55e", "#f59e0b", "#ec4899", "#f97316", "#14b8a6", "#6366f1"];

/* ─── Decision Trend Chart ─────────────────────────────────────────── */
export function DecisionTrendChart({ data }) {
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">Decision Flow Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="proposed" name="Proposed" fill="#d1d5db" radius={[4, 4, 0, 0]} />
          <Bar dataKey="approved" name="Approved" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
          <Bar dataKey="implemented" name="Implemented" fill="#22c55e" radius={[4, 4, 0, 0]} />
          <Line type="monotone" dataKey="avgDaysToDecide" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} name="Avg Days to Decide" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Category Breakdown ───────────────────────────────────────────── */
export function CategoryBreakdownChart({ data }) {
  const catColors = Object.values(CATEGORY_CONFIG).map((c) => c.color);

  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">Decisions by Category</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" outerRadius={100} innerRadius={50} paddingAngle={2} dataKey="count" nameKey="category">
            {data.map((entry, i) => {
              const catConfig = CATEGORY_CONFIG[entry.category] || {};
              return <Cell key={i} fill={catConfig.color || catColors[i % catColors.length]} />;
            })}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Implementation Speed ─────────────────────────────────────────── */
export function ImplementationSpeedChart({ data }) {
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">Implementation Timeline</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="implGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="approved" stroke="#0ea5e9" fill="transparent" name="Approved" strokeWidth={2} />
          <Area type="monotone" dataKey="implemented" stroke="#22c55e" fill="url(#implGrad)" name="Implemented" strokeWidth={2.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Impact Analysis Bar ──────────────────────────────────────────── */
export function ImpactAnalysisChart({ data }) {
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">Impact Distribution</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="impact" tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => {
              const config = IMPACT_CONFIG[entry.impact] || {};
              return <Cell key={i} fill={config.color || COLORS[i]} />;
            })}
          </Bar>
          <Bar dataKey="successRate" name="Success Rate %" fill="#22c55e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Velocity Chart ───────────────────────────────────────────────── */
export function DecisionVelocityChart({ data }) {
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">Decision Velocity</h3>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
          <Bar yAxisId="left" dataKey="totalDecisions" name="Decisions" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="stakeholderSatisfaction" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 4 }} name="Satisfaction %" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Approval Funnel ──────────────────────────────────────────────── */
export function ApprovalFunnelChart({ stats }) {
  const funnelData = [
    { stage: 'Proposed', count: stats.totalDecisions, fill: '#d1d5db' },
    { stage: 'In Review', count: Math.floor(stats.totalDecisions * 0.7), fill: '#f59e0b' },
    { stage: 'Approved', count: Math.floor(stats.totalDecisions * 0.55), fill: '#0ea5e9' },
    { stage: 'Implemented', count: stats.implementedCount, fill: '#22c55e' },
  ];

  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">Decision Funnel</h3>
      <div className="space-y-2">
        {funnelData.map((stage, i) => {
          const maxCount = funnelData[0].count;
          const width = (stage.count / maxCount) * 100;
          return (
            <div key={stage.stage} className="flex items-center gap-3">
              <span className="text-[10px] text-slate-500 w-20 text-right">{stage.stage}</span>
              <div className="flex-1 h-8 bg-slate-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                <div className="h-full rounded-lg transition-all duration-700 flex items-center px-3"
                  style={{ width: `${width}%`, backgroundColor: stage.fill }}>
                  <span className="text-[10px] font-bold text-white">{stage.count}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
