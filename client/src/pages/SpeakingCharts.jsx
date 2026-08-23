import React from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ComposedChart, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter,
} from "recharts";

const COLORS = ["#8b5cf6", "#0ea5e9", "#22c55e", "#f59e0b", "#ec4899", "#f97316", "#14b8a6", "#6366f1", "#ef4444", "#6b7280"];

/* ─── Speaking Distribution Pie ────────────────────────────────────── */
export function SpeakingDistributionPie({ data }) {
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">Speaking Time Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" outerRadius={110} innerRadius={55} paddingAngle={2} dataKey="speakingPercent" nameKey="name">
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} formatter={(v) => [`${v}%`, "Speaking Time"]} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Balance Trend Chart ──────────────────────────────────────────── */
export function BalanceTrendChart({ data }) {
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">Balance Score Trend</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <YAxis domain={[30, 100]} tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
          <Area type="monotone" dataKey="balanceScore" stroke="#22c55e" fill="url(#balGrad)" name="Balance Score" strokeWidth={2.5} />
          <Line type="monotone" dataKey="interruptionRate" stroke="#ef4444" strokeWidth={2} dot={false} name="Interruption Rate" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Meeting Type Comparison ──────────────────────────────────────── */
export function MeetingTypeComparisonChart({ data }) {
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">Balance by Meeting Type</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <YAxis dataKey="type" type="category" width={100} tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
          <Bar dataKey="avgBalance" name="Balance Score" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.avgBalance >= 85 ? "#22c55e" : entry.avgBalance >= 70 ? "#0ea5e9" : entry.avgBalance >= 45 ? "#f59e0b" : "#ef4444"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Turn Sequence Timeline ───────────────────────────────────────── */
export function TurnSequenceChart({ turns }) {
  const colors = { question: "#8b5cf6", statement: "#0ea5e9", response: "#22c55e" };

  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">Turn Sequence</h3>
      <div className="relative h-16 bg-slate-50 dark:bg-gray-700/50 rounded-lg overflow-hidden">
        {turns.map((turn, i) => {
          const left = (turn.startTime / turns[turns.length - 1].startTime) * 100;
          const width = (turn.duration / turns[turns.length - 1].startTime) * 100;
          return (
            <div
              key={turn.id}
              className="absolute top-1 bottom-1 rounded-sm transition-all hover:opacity-80"
              style={{
                left: `${left}%`,
                width: `${Math.max(width, 0.5)}%`,
                backgroundColor: colors[turn.type] || "#6b7280",
                opacity: turn.interrupted ? 0.5 : 1,
              }}
              title={`${turn.speaker} (${turn.type}) - ${turn.duration}min${turn.interrupted ? ' [interrupted]' : ''}`}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-400">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#8b5cf6" }} /> Question</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#0ea5e9" }} /> Statement</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#22c55e" }} /> Response</span>
      </div>
    </div>
  );
}

/* ─── Radar Pattern Chart ──────────────────────────────────────────── */
export function PatternRadarChart({ patterns }) {
  const radarData = patterns.slice(0, 6).map((p) => ({
    name: p.name.split(" ")[0],
    listening: p.listeningScore,
    collaboration: p.collaborationScore,
    turnLength: Math.min(p.avgTurnLength * 20, 100),
    questions: Math.min(p.questionsAsked * 10, 100),
  }));

  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">Speaking Patterns Radar</h3>
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} />
          <PolarRadiusAxis tick={{ fontSize: 9, fill: "#9ca3af" }} />
          <Radar name="Listening" dataKey="listening" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} strokeWidth={2} />
          <Radar name="Collaboration" dataKey="collaboration" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} strokeWidth={2} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Silence Analysis Chart ───────────────────────────────────────── */
export function SilenceAnalysisChart({ data }) {
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">Silence Analysis by Hour</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#9ca3af" }} interval={2} />
          <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
          <Bar dataKey="silencePercent" name="Silence %" fill="#6366f1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Interruption Heatmap ─────────────────────────────────────────── */
export function InterruptionHeatmapChart({ data }) {
  const names = data.map((d) => d.name.split(" ")[0]);
  const allTargets = [...new Set(data.flatMap((d) => d.interruptions.map((i) => i.target.split(" ")[0])))].slice(0, 5);

  const matrix = data.map((row) => {
    const obj = { name: row.name.split(" ")[0] };
    allTargets.forEach((target) => {
      const match = row.interruptions.find((i) => i.target.split(" ")[0] === target);
      obj[target] = match ? match.count : 0;
    });
    return obj;
  });

  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-gray-100 mb-3">Interruption Matrix</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={matrix}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#9ca3af" }} />
          <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
          <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
          {allTargets.map((target, i) => (
            <Bar key={target} dataKey={target} stackId="a" fill={COLORS[i % COLORS.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
