import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, AlertTriangle, Cpu } from "lucide-react";
import { adminAiUsageApi } from "../../services/adminAiUsageApi.js";

const defaultRange = () => {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 13);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
};

const fmtUsd = (n) =>
  `$${(Number(n) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })}`;

export default function AiUsageMetrics() {
  const [range, setRange] = useState(defaultRange);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [metrics, setMetrics] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await adminAiUsageApi.getMetrics(range);
      if (data?.success === false) {
        setError(data.message || "Failed to load AI usage");
        setMetrics(null);
      } else {
        setMetrics(data);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load AI usage");
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const maxRequests = useMemo(() => {
    const series = metrics?.series || [];
    return Math.max(1, ...series.map((d) => d.requests || 0));
  }, [metrics]);

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading AI usage…
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-8 text-center">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-3" />
        <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">
          {error}
        </p>
        <button
          type="button"
          onClick={load}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  const totals = metrics?.totals || {};
  const series = metrics?.series || [];
  const budget = metrics?.budgetAlert;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <label className="text-xs font-semibold text-slate-500">
            From
            <input
              type="date"
              value={range.from}
              onChange={(e) =>
                setRange((r) => ({ ...r, from: e.target.value }))
              }
              className="mt-1 block rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            To
            <input
              type="date"
              value={range.to}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              className="mt-1 block rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {budget?.enabled && budget.exceeded ? (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          Daily AI budget of {fmtUsd(budget.dailyBudgetUsd)} exceeded (today{" "}
          {fmtUsd(budget.todayCostUsd)}).
        </div>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ["Requests", totals.requests ?? 0],
          ["Tokens", totals.tokens ?? 0],
          ["Est. cost", fmtUsd(totals.estimatedCostUsd)],
          ["Errors", totals.errors ?? 0],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              {label}
            </p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Daily requests
          </h3>
        </div>
        {series.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">
            No instrumented AI usage in this range yet.
          </p>
        ) : (
          <div className="flex items-end gap-1.5 h-40">
            {series.map((day) => (
              <div
                key={day.date}
                className="flex-1 min-w-0 flex flex-col items-center gap-1 h-full justify-end"
                title={`${day.date}: ${day.requests} req, ${day.tokens} tok, ${fmtUsd(day.estimatedCostUsd)}`}
              >
                <div
                  className="w-full max-w-[28px] rounded-t-md bg-indigo-500/80 dark:bg-indigo-400/70"
                  style={{
                    height: `${Math.max(4, (day.requests / maxRequests) * 100)}%`,
                  }}
                />
                <span className="text-[9px] text-slate-400 truncate w-full text-center">
                  {day.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="mt-4 text-xs text-slate-400">
          Gemini requests: {totals.geminiRequests ?? 0} · Embeddings:{" "}
          {totals.embeddingRequests ?? 0} · Embedding chars:{" "}
          {totals.embeddingChars ?? 0}. Metrics exclude prompt contents.
        </p>
      </div>
    </div>
  );
}
