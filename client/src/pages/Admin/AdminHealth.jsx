import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Database,
  Cpu,
  Layers,
  RefreshCw,
  Copy,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowLeft,
  Terminal,
  Loader2,
  ExternalLink,
} from "lucide-react";
import Navbar from "../../components/Navbar.jsx";
import { adminHealthApi } from "../../services/adminHealthApi";
import { toast } from "react-toastify";

const STATUS_ICONS = {
  operational: CheckCircle2,
  up: CheckCircle2,
  degraded: AlertTriangle,
  disabled: AlertTriangle,
  outage: XCircle,
  down: XCircle,
  unknown: AlertTriangle,
};

const STATUS_STYLES = {
  operational:
    "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400",
  up: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400",
  degraded:
    "bg-amber-50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-900/30 text-amber-600 dark:text-amber-400",
  disabled:
    "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400",
  outage:
    "bg-rose-50 dark:bg-rose-950/20 border-rose-200/50 dark:border-rose-900/30 text-rose-600 dark:text-rose-400",
  down: "bg-rose-50 dark:bg-rose-950/20 border-rose-200/50 dark:border-rose-900/30 text-rose-600 dark:text-rose-400",
  unknown:
    "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400",
};

const AdminHealth = () => {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchHealthReport = useCallback(async (showToast = false) => {
    setIsRefreshing(true);
    try {
      const res = await adminHealthApi.getReport();
      if (res.data) {
        setReport(res.data);
        if (showToast) {
          toast.success("Health report updated.");
        }
      }
    } catch (err) {
      console.error("Failed to fetch admin health report", err);
      toast.error("Failed to load dependency health details.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHealthReport();
  }, [fetchHealthReport]);

  const copyDiagnostics = () => {
    if (!report) return;
    const cleanReport = JSON.stringify(report, null, 2);
    navigator.clipboard.writeText(cleanReport);
    toast.success("Diagnostics copied to clipboard.");
  };

  const getOverallPresentation = () => {
    if (loading) {
      return {
        label: "Checking System Health",
        className:
          "bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800",
        indicator: "bg-slate-400",
      };
    }

    switch (report?.overallStatus) {
      case "UP":
        return {
          label: "All Systems Operational",
          className:
            "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50",
          indicator: "bg-emerald-500",
        };
      case "DEGRADED":
        return {
          label: "Systems Degraded",
          className:
            "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50",
          indicator: "bg-amber-500",
        };
      case "DOWN":
        return {
          label: "System Outage",
          className:
            "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50",
          indicator: "bg-rose-500",
        };
      default:
        return {
          label: "Status Unknown",
          className:
            "bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800",
          indicator: "bg-slate-400",
        };
    }
  };

  const StatusBadge = ({ status }) => {
    const Icon = STATUS_ICONS[status] || STATUS_ICONS.unknown;
    const style = STATUS_STYLES[status] || STATUS_STYLES.unknown;
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${style}`}
      >
        <Icon className="w-3.5 h-3.5" />
        <span className="capitalize">
          {status === "up"
            ? "Operational"
            : status === "outage"
              ? "Offline"
              : status}
        </span>
      </span>
    );
  };

  const overall = getOverallPresentation();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Navbar />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Navigation / Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <Link
              to="/admin-panel"
              className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Admin Panel
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              Dependency Health & Diagnostics
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Live authenticated telemetry from core platform dependencies.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchHealthReport(true)}
              disabled={isRefreshing || loading}
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 text-sm font-bold shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <button
              onClick={copyDiagnostics}
              disabled={loading || !report}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-bold shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              Copy Diagnostics
            </button>
          </div>
        </div>

        {/* Overall Status Banner */}
        <div
          className={`p-6 border rounded-2xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition shadow-sm ${overall.className}`}
        >
          <div className="flex items-start gap-4">
            <span className="relative flex h-4 w-4 mt-1 md:mt-0.5 shrink-0">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${overall.indicator}`}
              />
              <span
                className={`relative inline-flex rounded-full h-4 w-4 ${overall.indicator}`}
              />
            </span>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                {overall.label}
              </h2>
              <p className="text-sm opacity-90 mt-1">
                Last checked:{" "}
                {report
                  ? new Date(report.timestamp).toLocaleTimeString()
                  : "Checking..."}
              </p>
            </div>
          </div>
          {report?.uptimeSeconds && (
            <div className="text-xs font-semibold opacity-85">
              Uptime: {Math.floor(report.uptimeSeconds / 3600)}h{" "}
              {Math.floor((report.uptimeSeconds % 3600) / 60)}m
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-semibold">
              Resolving dependency metrics...
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Dependency Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* MongoDB Card */}
              {report?.dependencies?.mongodb && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400">
                          <Database className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white">
                            MongoDB Database
                          </h3>
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            Primary Datastore
                          </p>
                        </div>
                      </div>
                      <StatusBadge
                        status={report.dependencies.mongodb.status}
                      />
                    </div>

                    {/* Telemetry fields */}
                    <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/60 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">
                          Response Latency:
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {report.dependencies.mongodb.latencyMs !== undefined
                            ? `${report.dependencies.mongodb.latencyMs}ms`
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Host:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                          {report.dependencies.mongodb.details?.host || "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Database Name:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {report.dependencies.mongodb.details?.name || "—"}
                        </span>
                      </div>
                      {report.dependencies.mongodb.details?.collections && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-slate-400">
                              Collections count:
                            </span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {report.dependencies.mongodb.details.collections}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">
                              Objects count:
                            </span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {report.dependencies.mongodb.details.objects}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {report.dependencies.mongodb.detail &&
                    report.dependencies.mongodb.status !== "up" && (
                      <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
                        <Terminal className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span className="font-mono">
                          {report.dependencies.mongodb.detail}
                        </span>
                      </div>
                    )}
                </div>
              )}

              {/* Redis Card */}
              {report?.dependencies?.redis && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
                          <Cpu className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white">
                            Redis Cache
                          </h3>
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            Cache & Rate Limiting
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={report.dependencies.redis.status} />
                    </div>

                    {/* Telemetry fields */}
                    <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/60 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">
                          Response Latency:
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {report.dependencies.redis.latencyMs !== undefined &&
                          report.dependencies.redis.latencyMs !== null
                            ? `${report.dependencies.redis.latencyMs}ms`
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Configuration:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {report.dependencies.redis.details?.configured
                            ? "Configured"
                            : "Not configured"}
                        </span>
                      </div>
                      {report.dependencies.redis.details?.usedMemory && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Used Memory:</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {report.dependencies.redis.details.usedMemory}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">
                              Clients connected:
                            </span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {
                                report.dependencies.redis.details
                                  .connectedClients
                              }
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {report.dependencies.redis.status !== "up" && (
                    <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-xs text-amber-800 dark:text-amber-300 flex flex-col gap-2">
                      <div className="flex items-start gap-2">
                        <Terminal className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span className="font-mono">
                          {report.dependencies.redis.detail ||
                            "Connection offline."}
                        </span>
                      </div>
                      <a
                        href="https://docs.meetonmemory.com/redis-setup"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-amber-700 dark:text-amber-400 hover:underline"
                      >
                        Troubleshoot Redis in Docs
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Queues Card */}
              {report?.dependencies?.queues && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400">
                          <Layers className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white">
                            BullMQ Queues
                          </h3>
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            Background Worker Queues
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={report.dependencies.queues.status} />
                    </div>

                    {/* Telemetry fields */}
                    <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/60 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Active workers:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {report.dependencies.queues.activeWorkersCount}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">
                          Total queues count:
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {report.dependencies.queues.queuesCount}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">
                          Operational queues:
                        </span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {report.dependencies.queues.queuesUp} Up
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">
                          Unavailable queues:
                        </span>
                        <span
                          className={`font-semibold ${report.dependencies.queues.queuesDown > 0 ? "text-rose-500" : "text-slate-500"}`}
                        >
                          {report.dependencies.queues.queuesDown} Down
                        </span>
                      </div>
                    </div>
                  </div>

                  {report.dependencies.queues.status !== "operational" && (
                    <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
                      <Terminal className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>
                        Queue processing is degraded. Ensure Redis is running
                        and workers are healthy.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Detailed Queues Listing */}
            {report?.dependencies?.queues?.queues?.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                  Background Queues Status
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-xs uppercase text-slate-400 dark:text-slate-500 font-bold">
                        <th className="pb-3">Queue Name</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 text-right">Waiting</th>
                        <th className="pb-3 text-right">Active</th>
                        <th className="pb-3 text-right">Delayed</th>
                        <th className="pb-3 text-right">Failed</th>
                        <th className="pb-3 text-right">Completed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {report.dependencies.queues.queues.map((q) => (
                        <tr
                          key={q.name}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10"
                        >
                          <td className="py-3 font-semibold text-slate-800 dark:text-slate-200 font-mono text-xs">
                            {q.name}
                          </td>
                          <td className="py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                                q.status === "operational"
                                  ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400"
                                  : "bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400"
                              }`}
                            >
                              {q.status}
                            </span>
                          </td>
                          <td className="py-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            {q.counts.waiting}
                          </td>
                          <td className="py-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            {q.counts.active}
                          </td>
                          <td className="py-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            {q.counts.delayed}
                          </td>
                          <td className="py-3 text-right font-mono text-rose-600 dark:text-rose-400 font-semibold">
                            {q.counts.failed}
                          </td>
                          <td className="py-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            {q.counts.completed}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminHealth;
