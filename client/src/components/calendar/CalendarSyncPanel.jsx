import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Calendar as CalendarIcon,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
  ExternalLink,
  Loader2,
  Cloud,
} from "lucide-react";
import apiClient from "../../services/apiClient.js";
import {
  validateCalendarOAuthAuthUrl,
  CALENDAR_OAUTH_FALLBACK_PATH,
} from "../../utils/validateCalendarOAuthRedirect.js";
import { validateRedirect } from "../../utils/validateRedirect.js";

const CalendarSyncPanel = ({ onSyncComplete, isCompact = false }) => {
  const navigate = useNavigate();
  const [integrations, setIntegrations] = useState([]);
  const [setLoading] = useState(true);
  const [resyncing, setResyncing] = useState({});

  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/api/calendar/status");
      if (res.data?.success) {
        setIntegrations(res.data.integrations || []);
      }
    } catch (err) {
      console.error("Failed to fetch calendar status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const connectProvider = async (provider) => {
    try {
      const res = await apiClient.get(`/api/calendar/${provider}/connect`);
      const redirectUrl = res.data?.url || res.data?.authUrl;
      if (res.data?.success && redirectUrl) {
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
    } catch (err) {
      console.error(`Failed to connect ${provider}:`, err);
      toast.error(`Failed to connect ${provider} calendar`);
    }
  };

  const handleResync = async (provider) => {
    setResyncing((prev) => ({ ...prev, [provider]: true }));
    try {
      const res = await apiClient.post(`/api/calendar/resync/${provider}`);
      if (res.data?.success) {
        toast.success(`Successfully resynced ${provider} calendar`);
        fetchIntegrations();
        if (onSyncComplete) onSyncComplete();
      } else {
        toast.error(res.data?.message || `Failed to resync ${provider}`);
      }
    } catch (err) {
      console.error(`Failed to resync ${provider}:`, err);
      toast.error(`Failed to resync ${provider} calendar`);
    } finally {
      setResyncing((prev) => ({ ...prev, [provider]: false }));
    }
  };

  const getProviderInfo = (providerKey) => {
    const integration = integrations.find((i) => i.provider === providerKey);
    const isConnected =
      integration?.syncStatus === "connected" ||
      integration?.syncStatus === "active" ||
      integration?.connected === true ||
      integration?.syncEnabled === true;
    const needsReauth = integration?.syncStatus === "needs_reauth";
    return { integration, isConnected, needsReauth };
  };

  const googleInfo = getProviderInfo("google");
  const outlookInfo = getProviderInfo("outlook");

  if (isCompact) {
    return (
      <div
        className="flex flex-wrap items-center gap-2"
        data-testid="calendar-sync-badges"
      >
        {/* Google Status Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xs">
          <Cloud className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-slate-700 dark:text-slate-200">Google:</span>
          {googleInfo.isConnected ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
              <CheckCircle2 className="w-3 h-3" /> Connected
            </span>
          ) : googleInfo.needsReauth ? (
            <button
              onClick={() => connectProvider("google")}
              className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline font-bold cursor-pointer"
            >
              <AlertCircle className="w-3 h-3" /> Reconnect
            </button>
          ) : (
            <button
              onClick={() => connectProvider("google")}
              className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
            >
              <LinkIcon className="w-3 h-3" /> Connect
            </button>
          )}
          {googleInfo.isConnected && (
            <button
              onClick={() => handleResync("google")}
              disabled={resyncing["google"]}
              className="ml-1 p-0.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md cursor-pointer disabled:opacity-50"
              title="Resync Google Calendar"
              aria-label="Resync Google Calendar"
            >
              <RefreshCw
                className={`w-3 h-3 ${resyncing["google"] ? "animate-spin text-blue-600" : ""}`}
              />
            </button>
          )}
        </div>

        {/* Outlook Status Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xs">
          <Cloud className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span className="text-slate-700 dark:text-slate-200">Outlook:</span>
          {outlookInfo.isConnected ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
              <CheckCircle2 className="w-3 h-3" /> Connected
            </span>
          ) : outlookInfo.needsReauth ? (
            <button
              onClick={() => connectProvider("outlook")}
              className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline font-bold cursor-pointer"
            >
              <AlertCircle className="w-3 h-3" /> Reconnect
            </button>
          ) : (
            <button
              onClick={() => connectProvider("outlook")}
              className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
            >
              <LinkIcon className="w-3 h-3" /> Connect
            </button>
          )}
          {outlookInfo.isConnected && (
            <button
              onClick={() => handleResync("outlook")}
              disabled={resyncing["outlook"]}
              className="ml-1 p-0.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md cursor-pointer disabled:opacity-50"
              title="Resync Outlook Calendar"
              aria-label="Resync Outlook Calendar"
            >
              <RefreshCw
                className={`w-3 h-3 ${resyncing["outlook"] ? "animate-spin text-blue-600" : ""}`}
              />
            </button>
          )}
        </div>

        {/* Manage Settings Deep-Link */}
        <button
          onClick={() => navigate("/settings")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-all shadow-xs cursor-pointer"
          title="Manage Calendar Integrations in Settings"
        >
          <CalendarIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Manage Sync</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-2xl p-5 shadow-xs mb-6"
      data-testid="calendar-sync-panel"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 rounded-xl text-blue-600 dark:text-blue-400">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Calendar Integrations & Sync
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Two-way calendar sync for Google & Microsoft Outlook
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Google Connect/Resync */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Google Calendar
            </span>
            {googleInfo.isConnected ? (
              <>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                </span>
                <button
                  onClick={() => handleResync("google")}
                  disabled={resyncing["google"]}
                  className="px-2.5 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${resyncing["google"] ? "animate-spin" : ""}`}
                  />
                  Resync
                </button>
              </>
            ) : (
              <button
                onClick={() => connectProvider("google")}
                className="px-2.5 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs cursor-pointer inline-flex items-center gap-1"
              >
                <LinkIcon className="w-3 h-3" /> Connect Google
              </button>
            )}
          </div>

          {/* Outlook Connect/Resync */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Outlook
            </span>
            {outlookInfo.isConnected ? (
              <>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                </span>
                <button
                  onClick={() => handleResync("outlook")}
                  disabled={resyncing["outlook"]}
                  className="px-2.5 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${resyncing["outlook"] ? "animate-spin" : ""}`}
                  />
                  Resync
                </button>
              </>
            ) : (
              <button
                onClick={() => connectProvider("outlook")}
                className="px-2.5 py-1 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-xs cursor-pointer inline-flex items-center gap-1"
              >
                <LinkIcon className="w-3 h-3" /> Connect Outlook
              </button>
            )}
          </div>

          <button
            onClick={() => navigate("/settings")}
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-700 transition-all cursor-pointer"
            title="Settings & Integrations"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarSyncPanel;
