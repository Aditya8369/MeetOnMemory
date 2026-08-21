import React, { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "../components/Navbar.jsx";
import ErrorState from "../components/ErrorState.jsx";
import {
  fetchPlatformStatus,
  STATUS_POLL_INTERVAL_SEC,
} from "../services/statusApi.js";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Globe,
  Database,
  Cpu,
  Layers,
  HardDrive,
  Activity,
  Info,
  HelpCircle,
} from "lucide-react";

const SERVICE_ICONS = {
  webApp: Globe,
  api: Layers,
  geminiAi: Cpu,
  mongodb: Database,
  vectorDb: Database,
  webSocket: Activity,
  redis: Activity,
  storage: HardDrive,
};

const SERVICE_ICON_STYLES = {
  webApp: "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400",
  api: "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400",
  geminiAi:
    "bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400",
  mongodb:
    "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400",
  vectorDb:
    "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400",
  webSocket:
    "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400",
  redis:
    "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400",
  storage: "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400",
};

const STATUS_BADGE = {
  operational: {
    label: "Operational",
    Icon: CheckCircle2,
    className:
      "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400",
  },
  degraded: {
    label: "Degraded",
    Icon: AlertTriangle,
    className:
      "bg-amber-50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-900/30 text-amber-600 dark:text-amber-400",
  },
  outage: {
    label: "Offline",
    Icon: XCircle,
    className:
      "bg-rose-50 dark:bg-rose-950/20 border-rose-200/50 dark:border-rose-900/30 text-rose-600 dark:text-rose-400",
  },
  unknown: {
    label: "Unknown",
    Icon: HelpCircle,
    className:
      "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400",
  },
  checking: {
    label: "Checking...",
    Icon: null,
    className:
      "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 animate-pulse",
  },
};

const getOverallPresentation = (loadState, platformStatus, fetchError) => {
  if (loadState === "loading") {
    return {
      label: "Checking System Status",
      description: "Running live health checks against platform services.",
      color:
        "text-slate-600 bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800",
      indicator: "bg-slate-400",
    };
  }

  if (loadState === "error") {
    return {
      label: "Status Unavailable",
      description:
        fetchError ||
        "Unable to reach the platform status endpoint. Health checks could not be completed.",
      color:
        "text-rose-600 bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50",
      indicator: "bg-rose-500",
    };
  }

  switch (platformStatus?.status) {
    case "operational":
      return {
        label: "All Systems Operational",
        description:
          "Monitored platform services are responding normally. Unmonitored integrations are listed separately.",
        color:
          "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50",
        indicator: "bg-emerald-500",
      };
    case "degraded":
      return {
        label: "Partial System Degradation",
        description:
          "One or more monitored services are degraded. Core functionality may be limited.",
        color:
          "text-amber-600 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50",
        indicator: "bg-amber-500",
      };
    case "outage":
      return {
        label: "System Outage",
        description:
          "A required monitored service is unavailable. Platform functionality is impacted.",
        color:
          "text-rose-600 bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50",
        indicator: "bg-rose-500",
      };
    default:
      return {
        label: "Status Unknown",
        description:
          "Health checks completed but the overall platform status could not be determined.",
        color:
          "text-slate-600 bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800",
        indicator: "bg-slate-400",
      };
  }
};

const formatLatency = (latencyMs) =>
  typeof latencyMs === "number" ? `${latencyMs}ms` : "N/A";

const ServiceStatusBadge = ({ status }) => {
  const config = STATUS_BADGE[status] || STATUS_BADGE.unknown;
  const { label, Icon, className } = config;

  return (
    <span
      className={`px-2.5 py-1 border font-semibold text-xs rounded-full flex items-center gap-1.5 ${className}`}
    >
      {Icon ? <Icon className="w-3.5 h-3.5" /> : null}
      {label}
    </span>
  );
};

const Status = () => {
  const [loadState, setLoadState] = useState("loading");
  const [platformStatus, setPlatformStatus] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [services, setServices] = useState([]);
  const [refreshCountdown, setRefreshCountdown] = useState(
    STATUS_POLL_INTERVAL_SEC,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [latencyHistory, setLatencyHistory] = useState([]);

  const fetchSequenceRef = useRef(0);
  const abortControllerRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const hasLoadedRef = useRef(false);

  const applyStatusResult = useCallback((result) => {
    const { ok, latencyMs, data } = result;
    const enrichedServices = (data.services || []).map((service) =>
      service.id === "api"
        ? { ...service, latencyMs, status: service.status || "unknown" }
        : service,
    );

    setPlatformStatus(data);
    setServices(enrichedServices);
    setLastUpdated(new Date());

    const mongoLatency = enrichedServices.find(
      (s) => s.id === "mongodb",
    )?.latencyMs;
    const redisLatency = enrichedServices.find(
      (s) => s.id === "redis",
    )?.latencyMs;

    setLatencyHistory((prev) => {
      const nowStr = new Date().toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      });
      const next = [
        ...prev,
        {
          id: prev.length > 0 ? prev[prev.length - 1].id + 1 : 1,
          time: nowStr,
          api: latencyMs,
          mongodb: mongoLatency ?? null,
          redis: redisLatency ?? null,
        },
      ];
      return next.length > 10 ? next.slice(-10) : next;
    });

    if (!data.success && !ok) {
      setLoadState("error");
      setFetchError(data.message || "Platform status check failed");
      return;
    }

    if (!ok || data.status === "outage") {
      setLoadState(data.status === "outage" ? "partial" : "error");
      setFetchError(
        data.status === "outage"
          ? null
          : data.message || "Platform status check failed",
      );
      return;
    }

    if (data.status === "degraded") {
      setLoadState("partial");
      setFetchError(null);
      return;
    }

    setLoadState("success");
    setFetchError(null);
    hasLoadedRef.current = true;
  }, []);

  const refreshStatus = useCallback(async () => {
    const requestId = ++fetchSequenceRef.current;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsRefreshing(true);
    if (!hasLoadedRef.current) {
      setLoadState("loading");
    }

    try {
      const result = await fetchPlatformStatus({ signal: controller.signal });

      if (requestId !== fetchSequenceRef.current) return;

      applyStatusResult(result);
    } catch (error) {
      if (requestId !== fetchSequenceRef.current) return;
      if (error.name === "AbortError") return;

      setLoadState("error");
      setFetchError("Unable to reach the platform status endpoint");
    } finally {
      if (requestId === fetchSequenceRef.current) {
        setIsRefreshing(false);
        setRefreshCountdown(STATUS_POLL_INTERVAL_SEC);
      }
    }
  }, [applyStatusResult]);

  useEffect(() => {
    refreshStatus();

    pollIntervalRef.current = setInterval(() => {
      refreshStatus();
    }, STATUS_POLL_INTERVAL_SEC * 1000);

    countdownIntervalRef.current = setInterval(() => {
      setRefreshCountdown((prev) =>
        prev <= 1 ? STATUS_POLL_INTERVAL_SEC : prev - 1,
      );
    }, 1000);

    return () => {
      fetchSequenceRef.current += 1;
      abortControllerRef.current?.abort();
      clearInterval(pollIntervalRef.current);
      clearInterval(countdownIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overall = getOverallPresentation(loadState, platformStatus, fetchError);

  const renderSvgPath = (key, width = 760, height = 220) => {
    const points = latencyHistory.filter(
      (item) => typeof item[key] === "number",
    );
    if (points.length < 2) return "";

    const maxVal =
      Math.max(
        ...latencyHistory.flatMap((item) =>
          [item.api, item.mongodb, item.redis].filter(
            (v) => typeof v === "number",
          ),
        ),
      ) * 1.15 || 400;
    const padding = 20;

    return points
      .map((item, idx) => {
        const x = padding + (idx * (width - 2 * padding)) / (points.length - 1);
        const val = item[key];
        const y = height - padding - (val / maxVal) * (height - 2 * padding);
        return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  };

  const monitoredServices = services.filter((service) => service.monitored);
  const unmonitoredServices = services.filter((service) => !service.monitored);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Navbar />

      <div className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              Platform Status
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Live health checks from platform monitoring endpoints.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Updating in {refreshCountdown}s
            </span>
            <button
              onClick={refreshStatus}
              disabled={isRefreshing}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition"
              aria-label="Refresh Status Now"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        <div
          className={`border p-6 rounded-2xl mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition shadow-xs ${overall.color}`}
        >
          <div className="flex items-start gap-4">
            <span className="relative flex h-4 w-4 mt-1.5 md:mt-0 flex-shrink-0">
              <span
                className={`${loadState === "loading" ? "animate-ping" : ""} absolute inline-flex h-full w-full rounded-full opacity-75 ${overall.indicator}`}
              />
              <span
                className={`relative inline-flex rounded-full h-4 w-4 ${overall.indicator}`}
              />
            </span>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                {overall.label}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                {overall.description}
              </p>
            </div>
          </div>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
            Last Checked:{" "}
            {lastUpdated
              ? lastUpdated.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })
              : "—"}
          </div>
        </div>

        {loadState === "error" && !platformStatus && (
          <div className="mb-8">
            <ErrorState
              title="Unable to Load Platform Status"
              message={fetchError || "Health checks could not be completed."}
              onRetry={refreshStatus}
              retryText="Retry Health Check"
            />
          </div>
        )}

        {loadState === "error" && platformStatus && (
          <div className="mb-8 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 p-4 text-sm text-rose-800 dark:text-rose-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span>
              {fetchError ||
                "Latest health check failed. Service details below may be outdated."}
            </span>
            <button
              onClick={refreshStatus}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        )}

        {loadState === "partial" && fetchError && (
          <div className="mb-8 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 p-4 text-sm text-amber-800 dark:text-amber-200">
            {fetchError}
          </div>
        )}

        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">
          Monitored Services
        </h3>

        {loadState === "loading" && services.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900 border border-slate-200/85 dark:border-slate-800/85 p-5 rounded-2xl animate-pulse h-40"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {monitoredServices.map((service) => {
              const Icon = SERVICE_ICONS[service.id] || Layers;
              const iconStyle =
                SERVICE_ICON_STYLES[service.id] ||
                "bg-slate-50 dark:bg-slate-800 text-slate-500";

              return (
                <div
                  key={service.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/85 dark:border-slate-800/85 p-5 rounded-2xl shadow-xs flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-lg ${iconStyle}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                          {service.name}
                        </h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {service.description}
                        </p>
                      </div>
                    </div>
                    <ServiceStatusBadge
                      status={
                        loadState === "loading" ? "checking" : service.status
                      }
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/50 pt-3">
                    <span>
                      Monitoring:{" "}
                      <strong className="text-slate-800 dark:text-slate-200">
                        Active
                      </strong>
                    </span>
                    <span>
                      Latency:{" "}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {formatLatency(service.latencyMs)}
                      </strong>
                    </span>
                  </div>
                  {service.message && service.status !== "operational" && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                      {service.message}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {unmonitoredServices.length > 0 && (
          <>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">
              Unmonitored Integrations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
              {unmonitoredServices.map((service) => {
                const Icon = SERVICE_ICONS[service.id] || HelpCircle;
                const iconStyle =
                  SERVICE_ICON_STYLES[service.id] ||
                  "bg-slate-50 dark:bg-slate-800 text-slate-500";

                return (
                  <div
                    key={service.id}
                    className="bg-white dark:bg-slate-900 border border-dashed border-slate-200/85 dark:border-slate-800/85 p-5 rounded-2xl shadow-xs"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg ${iconStyle}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                            {service.name}
                          </h4>
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            {service.description}
                          </p>
                        </div>
                      </div>
                      <ServiceStatusBadge status="unknown" />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {service.message || "Monitoring not configured"}
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="bg-white dark:bg-slate-900 border border-slate-200/85 dark:border-slate-800/85 p-6 rounded-2xl shadow-xs mb-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                Response Time History
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Measured latencies from recent live health checks (ms)
              </p>
            </div>
            <div className="flex gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400 flex-wrap">
              <span className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-indigo-500 inline-block" /> API
                Gateway
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-amber-500 inline-block" />{" "}
                Database
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-emerald-500 inline-block" /> Cache
              </span>
            </div>
          </div>

          {latencyHistory.length < 2 ? (
            <div className="text-center py-12 text-sm text-slate-500 dark:text-slate-400">
              Collecting latency samples from live health checks…
            </div>
          ) : (
            <div className="relative w-full h-[240px] bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/60 rounded-xl overflow-hidden px-2 pt-4">
              <svg
                viewBox="0 0 760 220"
                className="w-full h-full"
                preserveAspectRatio="none"
                role="img"
                aria-label="Latency history chart"
              >
                <path
                  d={renderSvgPath("api")}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d={renderSvgPath("mongodb")}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d={renderSvgPath("redis")}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <div className="flex justify-between px-4 text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-1">
                {latencyHistory.map((item) => (
                  <span key={item.id}>{item.time}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/85 dark:border-slate-800/85 p-5 rounded-2xl shadow-xs">
              <h3 className="text-md font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-slate-400" />
                Regional Infrastructure
              </h3>
              <div className="text-sm text-slate-500 dark:text-slate-400 flex items-start gap-3">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                  Regional latency monitoring is not configured for this
                  deployment. No regional metrics are displayed.
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/85 dark:border-slate-800/85 p-5 rounded-2xl shadow-xs">
              <h3 className="text-md font-bold text-slate-800 dark:text-slate-200 mb-4">
                Scheduled Maintenance
              </h3>
              <div className="text-sm text-slate-500 dark:text-slate-400 flex items-start gap-3">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                  No maintenance scheduling API is available. Scheduled
                  maintenance windows will appear here when configured.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/85 dark:border-slate-800/85 p-6 rounded-2xl shadow-xs">
              <div className="border-b border-slate-100 dark:border-slate-800/60 pb-5 mb-5">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  Incident Logs
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Historical incident data from platform monitoring
                </p>
              </div>

              <div className="text-center py-10">
                <CheckCircle2 className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Incident history unavailable
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-md mx-auto">
                  No incident logging API is configured for this deployment.
                  Live service health is shown above.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/85 dark:border-slate-800/85 p-5 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Status reflects live checks against{" "}
              <code className="text-[11px]">/api/status</code>, backed by the
              same dependency probes as{" "}
              <code className="text-[11px]">/health</code>. Admins can inspect
              background queues on the{" "}
              <a
                href="/admin-panel?module=jobs"
                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
              >
                Jobs dashboard
              </a>
              .
            </p>
          </div>
          <a
            href="mailto:support@meetonmemory.com"
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold text-xs rounded-xl shadow-xs whitespace-nowrap transition"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
};

export default Status;
