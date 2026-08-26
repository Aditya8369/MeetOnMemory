import React, { useCallback, useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  RefreshCw,
  RotateCcw,
  Trash2,
  Loader2,
  AlertTriangle,
  Activity,
} from "lucide-react";
import AppContent from "../../context/AppContent.js";
import { adminJobsApi } from "../../services/adminJobsApi.js";

const countTone = (n) =>
  n > 0
    ? "text-slate-900 dark:text-white"
    : "text-slate-400 dark:text-slate-500";

export default function JobsDashboard() {
  const { userData } = useContext(AppContent) || {};
  const canMutate = userData?.role === "owner";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [busyKey, setBusyKey] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await adminJobsApi.getDashboard({ failedLimit: 15 });
      if (data?.success === false) {
        setError(data.message || "Failed to load jobs");
        setDashboard(null);
      } else {
        setDashboard({
          redisConfigured: Boolean(data.redisConfigured),
          workers: data.workers || [],
          shuttingDown: Boolean(data.shuttingDown),
          queues: data.queues || [],
        });
      }
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to load background job status",
      );
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRetry = async (queueName, jobId) => {
    const key = `retry:${queueName}:${jobId}`;
    setBusyKey(key);
    try {
      await adminJobsApi.retryJob(queueName, jobId);
      toast.success("Job queued for retry");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Retry failed");
    } finally {
      setBusyKey(null);
    }
  };

  const handleDiscard = async (queueName, jobId) => {
    if (!window.confirm("Discard this failed job permanently?")) return;
    const key = `discard:${queueName}:${jobId}`;
    setBusyKey(key);
    try {
      await adminJobsApi.discardJob(queueName, jobId);
      toast.success("Failed job discarded");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Discard failed");
    } finally {
      setBusyKey(null);
    }
  };

  if (loading && !dashboard) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading job queues…
      </div>
    );
  }

  if (error && !dashboard) {
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

  const queues = dashboard?.queues || [];
  const failedFlat = queues.flatMap((q) =>
    (q.recentFailed || []).map((job) => ({ ...job, queueName: q.name })),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Redis{" "}
            {dashboard?.redisConfigured ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                connected
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                not configured
              </span>
            )}
            {dashboard?.workers?.length
              ? ` · ${dashboard.workers.length} worker(s)`
              : ""}
          </p>
          {!canMutate ? (
            <p className="text-xs text-slate-400 mt-1">
              Read-only: retry/discard requires owner role.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {queues.map((queue) => (
          <div
            key={queue.name}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Queue
                </p>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white break-all">
                  {queue.name}
                </h3>
              </div>
              <Activity
                className={`w-4 h-4 shrink-0 ${
                  queue.available
                    ? "text-emerald-500"
                    : "text-slate-300 dark:text-slate-600"
                }`}
              />
            </div>
            <dl className="grid grid-cols-3 gap-2 text-center">
              {[
                ["waiting", queue.counts?.waiting],
                ["active", queue.counts?.active],
                ["failed", queue.counts?.failed],
                ["delayed", queue.counts?.delayed],
                ["completed", queue.counts?.completed],
                ["paused", queue.counts?.paused],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg bg-slate-50 dark:bg-slate-800/60 px-2 py-2"
                >
                  <dt className="text-[10px] uppercase tracking-wide text-slate-400">
                    {label}
                  </dt>
                  <dd className={`text-sm font-bold ${countTone(value || 0)}`}>
                    {value ?? 0}
                  </dd>
                </div>
              ))}
            </dl>
            {queue.error ? (
              <p className="mt-2 text-xs text-rose-500">{queue.error}</p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
          Recent failed jobs
        </h3>
        {failedFlat.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-4 py-10 text-center text-sm text-slate-400">
            No recent failed jobs.
          </div>
        ) : (
          <ul className="space-y-3">
            {failedFlat.map((job) => {
              const retryKey = `retry:${job.queueName}:${job.id}`;
              const discardKey = `discard:${job.queueName}:${job.id}`;
              return (
                <li
                  key={`${job.queueName}-${job.id}`}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {job.name}{" "}
                        <span className="text-xs font-normal text-slate-500">
                          #{job.id}
                        </span>
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Queue: {job.queueName} · Attempts: {job.attemptsMade}
                      </p>
                      <p className="text-xs text-rose-600 dark:text-rose-400 mt-2 break-words">
                        {job.failedReason || "Unknown failure"}
                      </p>
                    </div>
                    {canMutate ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={busyKey === retryKey}
                          onClick={() => handleRetry(job.queueName, job.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white disabled:opacity-50 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Retry
                        </button>
                        <button
                          type="button"
                          disabled={busyKey === discardKey}
                          onClick={() => handleDiscard(job.queueName, job.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white disabled:opacity-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Discard
                        </button>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
