import React, { useCallback, useEffect, useState, useContext } from "react";
import { toast } from "react-toastify";
import {
  RefreshCw,
  Loader2,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldAlert,
  BrainCircuit,
  BarChart2,
  Activity,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { adminImportanceApi } from "../../services/adminImportanceApi.js";
import ConfirmModal from "../ConfirmModal.jsx";
import AppContent from "../../context/AppContent.js";

const statusBadgeClass = (status) => {
  switch (status) {
    case "completed":
      return "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    case "failed":
      return "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800";
    case "running":
      return "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 animate-pulse";
    default:
      return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700";
  }
};

export default function ImportanceRecalculationAdmin() {
  const navigate = useNavigate();
  const { userData } = useContext(AppContent) || {};
  const userRole = userData?.role || "member";
  const isAdminOrOwner = userRole === "admin" || userRole === "owner";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminImportanceApi.getStatus();
      if (res.data?.success || res.data) {
        setData(res.data?.data || res.data);
      }
    } catch (err) {
      console.error("Error loading importance recalculation status:", err);
      setError(
        err?.response?.data?.message ||
          "Failed to load importance recalculation status.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Polling when job is currently running
  useEffect(() => {
    let interval = null;
    const isRunning =
      data?.lastRun?.status === "running" ||
      data?.activeJob?.state === "active" ||
      data?.activeJob?.state === "waiting";

    if (isRunning) {
      interval = setInterval(() => {
        fetchStatus();
      }, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [data, fetchStatus]);

  const handleConfirmRecalculate = async () => {
    setShowConfirmModal(false);
    setIsTriggering(true);
    try {
      const res = await adminImportanceApi.triggerRecalculation();
      toast.success(
        res.data?.message ||
          "Importance recalculation job triggered successfully!",
      );
      await fetchStatus();
    } catch (err) {
      console.error("Error triggering importance recalculation:", err);
      toast.error(
        err?.response?.data?.message ||
          "Failed to trigger importance score recalculation.",
      );
    } finally {
      setIsTriggering(false);
    }
  };

  if (!isAdminOrOwner) {
    return (
      <div className="rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Access Restricted
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          Only Organization Admins or Owners have permission to view status or
          trigger importance score recalculation jobs.
        </p>
      </div>
    );
  }

  const lastRun = data?.lastRun || {};
  const stats = data?.stats || {};
  const activeJob = data?.activeJob;
  const isJobRunning =
    lastRun.status === "running" ||
    activeJob?.state === "active" ||
    activeJob?.state === "waiting" ||
    isTriggering;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Importance Score Recalculation Engine
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
            Recalculate dynamic importance ratings for all decisions and action
            items in your organization based on access frequency, age decay, and
            user feedback ratings.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={fetchStatus}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh Status
          </button>
          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            disabled={isJobRunning || loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {isJobRunning ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Zap className="w-4 h-4 text-amber-300" />
            )}
            <span>
              {isJobRunning ? "Job Running..." : "Recalculate Importance"}
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-200 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Total Decisions
            </span>
            <BarChart2 className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {loading ? "—" : (stats.decisions ?? 0)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Indexed organization decisions
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Total Action Items
            </span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {loading ? "—" : (stats.actionItems ?? 0)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Active & closed task items
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Execution Status
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-1">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${statusBadgeClass(
                lastRun.status,
              )}`}
            >
              {isJobRunning ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Running
                </>
              ) : (
                lastRun.status || "Idle"
              )}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {data?.redisActive
              ? "BullMQ Background Queue"
              : "Synchronous Execution"}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Last Recalculation
            </span>
            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {lastRun.completedAt
              ? new Date(lastRun.completedAt).toLocaleString()
              : lastRun.triggeredAt
                ? new Date(lastRun.triggeredAt).toLocaleString()
                : "Never run"}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {lastRun.results
              ? `${lastRun.results.decisions || 0} decisions, ${lastRun.results.actionItems || 0} action items`
              : "No historical metrics"}
          </p>
        </div>
      </div>

      {/* Details & Active Queue Job Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Recalculation Queue Details & Diagnostics
          </h3>
          <button
            type="button"
            onClick={() => navigate("/admin-panel?module=jobs")}
            className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            <span>Open Jobs Dashboard</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {activeJob ? (
          <div className="rounded-xl border border-indigo-200 dark:border-indigo-950 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                Active Queue Job #{activeJob.jobId}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                State: <strong className="uppercase">{activeJob.state}</strong>
                {activeJob.processedOn
                  ? ` · Started ${new Date(activeJob.processedOn).toLocaleTimeString()}`
                  : ""}
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 self-start sm:self-auto">
              In Progress
            </span>
          </div>
        ) : lastRun.error ? (
          <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-4 text-sm space-y-1">
            <p className="font-bold text-rose-800 dark:text-rose-300">
              Last Job Failure:
            </p>
            <p className="text-xs text-rose-700 dark:text-rose-400 font-mono">
              {lastRun.error}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-6 text-center text-xs text-slate-500">
            No recalculation job is currently queued or executing. Click
            "Recalculate Importance" above to initiate a fresh background sweep.
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmRecalculate}
        title="Recalculate Importance Scores?"
        message="This action will process all decisions and action items for your organization to recalculate their importance scores based on current usage and feedback metrics. Are you sure you want to proceed?"
        confirmText="Start Recalculation"
        cancelText="Cancel"
        isLoading={isTriggering}
        loadingText="Enqueuing..."
        variant="warning"
      />
    </div>
  );
}
