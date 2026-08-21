import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  RefreshCw,
  Loader2,
  Database,
  RotateCcw,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { adminEmbeddingsApi } from "../../services/adminEmbeddingsApi.js";

const statusClass = (status) => {
  switch (status) {
    case "succeeded":
      return "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300";
    case "failed":
      return "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300";
    case "queued":
    case "running":
      return "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300";
    default:
      return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300";
  }
};

export default function EmbeddingReindexAdmin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [meetings, setMeetings] = useState([]);
  const [busyKey, setBusyKey] = useState(null);
  const [lastJob, setLastJob] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await adminEmbeddingsApi.listStatus({ limit: 25 });
      setMeetings(data.meetings || []);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to load embedding status",
      );
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refreshJob = async (jobId) => {
    if (!jobId) return;
    try {
      const { data } = await adminEmbeddingsApi.getJobStatus(jobId);
      setLastJob(data);
    } catch {
      /* ignore transient poll errors */
    }
  };

  const handleOrgReindex = async () => {
    if (
      !window.confirm(
        "Reindex all meetings with transcripts for this organization? This is queued and rate-limited.",
      )
    ) {
      return;
    }
    setBusyKey("org");
    try {
      const { data } = await adminEmbeddingsApi.reindexOrg();
      toast.success(`Org reindex queued (${data.meetingCount || 0} meetings)`);
      setLastJob({
        jobId: data.jobId,
        state: data.status,
        name: data.jobName,
      });
      await load();
      await refreshJob(data.jobId);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to enqueue org reindex",
      );
    } finally {
      setBusyKey(null);
    }
  };

  const handleMeetingReindex = async (meetingId, title) => {
    if (!window.confirm(`Reindex vectors for “${title || "this meeting"}”?`)) {
      return;
    }
    setBusyKey(meetingId);
    try {
      const { data } = await adminEmbeddingsApi.reindexMeeting(meetingId);
      toast.success("Meeting reindex queued");
      setLastJob({
        jobId: data.jobId,
        state: data.status,
        name: data.jobName,
      });
      await load();
      await refreshJob(data.jobId);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to enqueue meeting reindex",
      );
    } finally {
      setBusyKey(null);
    }
  };

  if (loading && meetings.length === 0 && !error) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading embedding index status…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl">
          Queue Pinecone reindex jobs for a meeting or the whole org. Progress
          also appears under Admin → Jobs (
          <code className="text-[11px]">embedding-reindex-queue</code>).
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate("/admin-panel?module=jobs")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Jobs dashboard
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleOrgReindex}
            disabled={busyKey === "org"}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            <Database className="w-3.5 h-3.5" />
            Reindex organization
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-200 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      ) : null}

      {lastJob?.jobId ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">
              Last job: {lastJob.name || "reindex"} #{lastJob.jobId}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              State: {lastJob.state || "unknown"}
              {lastJob.progress
                ? ` · progress ${JSON.stringify(lastJob.progress)}`
                : ""}
              {lastJob.failedReason ? ` · ${lastJob.failedReason}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => refreshJob(lastJob.jobId)}
            className="text-xs font-semibold text-teal-600 dark:text-teal-400 cursor-pointer"
          >
            Refresh job status
          </button>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
          Meetings · index status
        </h3>
        {meetings.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">
            No meetings found for this organization.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {meetings.map((m) => {
              const idx = m.embeddingIndex || {};
              return (
                <li
                  key={m.id}
                  className="py-3 flex flex-wrap items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {m.title || "Untitled"}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {m.date
                        ? new Date(m.date).toLocaleDateString()
                        : "No date"}
                      {idx.lastIndexedAt
                        ? ` · last indexed ${new Date(idx.lastIndexedAt).toLocaleString()}`
                        : " · never indexed"}
                      {idx.lastJobId ? ` · job ${idx.lastJobId}` : ""}
                    </p>
                    {idx.lastError ? (
                      <p className="text-xs text-rose-500 mt-1 break-words">
                        {idx.lastError}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${statusClass(idx.status)}`}
                    >
                      {idx.status || "idle"}
                    </span>
                    <button
                      type="button"
                      disabled={!m.hasTranscript || busyKey === m.id}
                      onClick={() => handleMeetingReindex(m.id, m.title)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 disabled:opacity-40 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reindex
                    </button>
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
