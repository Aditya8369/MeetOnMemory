import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import {
  Calendar,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from "lucide-react";
import apiClient from "../services/apiClient.js";
import ConfirmModal from "./ConfirmModal.jsx";
import {
  validateCalendarOAuthAuthUrl,
  CALENDAR_OAUTH_FALLBACK_PATH,
} from "../utils/validateCalendarOAuthRedirect.js";
import { validateRedirect } from "../utils/validateRedirect.js";

const CalendarIntegrations = () => {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resyncing, setResyncing] = useState({});
  const [lastSyncResult, setLastSyncResult] = useState({});
  const [providerToDisconnect, setProviderToDisconnect] = useState(null);

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await apiClient.get("/api/calendar/status");
      if (res.data.success) {
        setIntegrations(res.data.integrations || []);
      }
    } catch (fetchErr) {
      console.error("Failed to fetch calendar integrations", fetchErr);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();

    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get("error");
    const sync = urlParams.get("sync");
    if (error === "google_sync_failed") {
      toast.error("Failed to connect Google Calendar");
    } else if (error === "outlook_sync_failed") {
      toast.error("Failed to connect Microsoft Outlook Calendar");
    } else if (sync === "success") {
      toast.success("Calendar connected successfully!");
    }
  }, [fetchIntegrations]);

  const connectProvider = async (provider) => {
    try {
      const res = await apiClient.get(`/api/calendar/${provider}/connect`);
      const redirectUrl = res.data?.url || res.data?.authUrl;
      if (res.data.success && redirectUrl) {
        const safeAuthUrl = validateCalendarOAuthAuthUrl(redirectUrl);
        if (safeAuthUrl) {
          window.location.href = safeAuthUrl;
          return;
        }
        toast.error(`Invalid authorization URL for ${provider}`);
        window.location.assign(
          validateRedirect(CALENDAR_OAUTH_FALLBACK_PATH, "/settings"),
        );
      } else {
        toast.error(`Failed to get authorization URL for ${provider}`);
      }
    } catch (connectErr) {
      console.error(`Failed to connect to ${provider}`, connectErr);
      toast.error(`Failed to connect to ${provider}`);
    }
  };

  const disconnectProvider = async (provider) => {
    try {
      const res = await apiClient.post(`/api/calendar/disconnect/${provider}`);
      if (res.data.success) {
        toast.success(`Disconnected ${provider} calendar`);
        fetchIntegrations();
      }
    } catch (disconnectErr) {
      console.error(`Failed to disconnect ${provider}`, disconnectErr);
      toast.error(`Failed to disconnect ${provider}`);
    }
  };

  const resyncProvider = async (provider) => {
    setResyncing((prev) => ({ ...prev, [provider]: true }));
    try {
      const res = await apiClient.post(`/api/calendar/resync/${provider}`);
      if (res.data.success) {
        const conn = res.data.connection;
        setLastSyncResult((prev) => ({
          ...prev,
          [provider]: conn?.lastResult || {
            status: "success",
            message: res.data.message,
            at: conn?.lastSyncedAt || conn?.lastSyncAt || new Date(),
          },
        }));
        toast.success(res.data.message || `Synced ${provider} successfully`);
        await fetchIntegrations();
      }
    } catch (err) {
      console.error(`Failed to resync ${provider}`, err);
      const message =
        err?.response?.data?.message ||
        `Failed to sync ${provider}. Check connection or reconnect.`;
      const conn = err?.response?.data?.connection;
      setLastSyncResult((prev) => ({
        ...prev,
        [provider]: conn?.lastResult || {
          status: "error",
          message,
          at: new Date(),
        },
      }));
      toast.error(message);
      await fetchIntegrations();
    } finally {
      setResyncing((prev) => ({ ...prev, [provider]: false }));
    }
  };

  const isConnected = (provider) =>
    integrations.some(
      (i) =>
        (i.provider === provider ||
          (provider === "outlook" && i.provider === "microsoft")) &&
        ["connected", "error", "needs_reauth", "syncing"].includes(
          i.syncStatus || (i.syncEnabled ? "connected" : ""),
        ),
    );

  const getIntegration = (provider) =>
    integrations.find(
      (i) =>
        i.provider === provider ||
        (provider === "outlook" && i.provider === "microsoft"),
    );

  const renderStatusBadge = (integration) => {
    if (!integration) return null;
    const status =
      integration.syncStatus ||
      (integration.syncEnabled ? "connected" : "disconnected");
    if (status === "connected") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-3 h-3" /> Connected
        </span>
      );
    }
    if (status === "syncing") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
          <RefreshCw className="w-3 h-3 animate-spin" /> Syncing
        </span>
      );
    }
    if (status === "needs_reauth") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
          <AlertCircle className="w-3 h-3" /> Needs Re-auth
        </span>
      );
    }
    if (status === "error") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-400 px-2 py-0.5 rounded-md border border-red-200 dark:border-red-800">
          <XCircle className="w-3 h-3" /> Error
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  const providers = [
    { key: "google", label: "Google Calendar", connectKey: "google" },
    { key: "outlook", label: "Microsoft Outlook", connectKey: "outlook" },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs mb-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-xl">
          <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Calendar Integrations
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sync meetings, view job history, and manually trigger Sync now when
            a provider fails
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {providers.map((p, idx) => {
          const connected = isConnected(p.key);
          const integration = getIntegration(p.key);
          const isSyncing = resyncing[p.key];
          const needsReauth = integration?.syncStatus === "needs_reauth";
          const result =
            lastSyncResult[p.key] || integration?.lastResult || null;
          const history = integration?.syncHistory || [];

          return (
            <div
              key={p.key}
              className={`py-3.5 ${
                idx < providers.length - 1
                  ? "border-b border-slate-100 dark:border-slate-800"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {p.label}
                    </p>
                    {renderStatusBadge(integration)}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {connected
                      ? `Last synced: ${
                          integration?.lastSyncedAt
                            ? new Date(
                                integration.lastSyncedAt,
                              ).toLocaleString()
                            : "Never"
                        }`
                      : `Connect your ${p.label} to sync meetings`}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {connected && !needsReauth && (
                    <button
                      type="button"
                      onClick={() => resyncProvider(p.key)}
                      disabled={isSyncing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`}
                      />
                      {isSyncing ? "Syncing…" : "Sync now"}
                    </button>
                  )}

                  {needsReauth ? (
                    <button
                      type="button"
                      onClick={() => connectProvider(p.connectKey)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors cursor-pointer shadow-xs"
                    >
                      Reconnect
                    </button>
                  ) : connected ? (
                    <button
                      type="button"
                      onClick={() => setProviderToDisconnect(p.key)}
                      className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 dark:text-red-400 rounded-lg transition-colors cursor-pointer"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => connectProvider(p.connectKey)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors cursor-pointer shadow-xs"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>

              {connected && (result || integration?.syncError) && (
                <div
                  className={`mt-2 rounded-lg px-3 py-2 text-xs ${
                    (result?.status || "error") === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800"
                      : "bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800"
                  }`}
                  role="status"
                >
                  <span className="font-semibold">Last result: </span>
                  {result?.message || integration?.syncError}
                </div>
              )}

              {connected && history.length > 0 && (
                <div className="mt-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                    Recent sync attempts
                  </p>
                  <ul className="space-y-1 max-h-28 overflow-y-auto">
                    {history.slice(0, 5).map((h, i) => (
                      <li
                        key={`${h.at}-${i}`}
                        className="text-[11px] text-slate-600 dark:text-slate-400 flex gap-2"
                      >
                        <span
                          className={
                            h.status === "success"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }
                        >
                          {h.status === "success" ? "OK" : "Fail"}
                        </span>
                        <span className="shrink-0 text-slate-400">
                          {h.at ? new Date(h.at).toLocaleString() : "—"}
                        </span>
                        <span className="truncate">
                          {h.message ||
                            (h.status === "success" ? "Synced" : "Sync failed")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmModal
        isOpen={Boolean(providerToDisconnect)}
        onClose={() => setProviderToDisconnect(null)}
        onConfirm={() => {
          if (providerToDisconnect) {
            disconnectProvider(providerToDisconnect);
            setProviderToDisconnect(null);
          }
        }}
        title="Disconnect Calendar Integration"
        message="Are you sure you want to disconnect this calendar provider? OAuth access will be revoked and meeting synchronization will be paused."
        confirmText="Disconnect"
      />
    </div>
  );
};

export default CalendarIntegrations;
