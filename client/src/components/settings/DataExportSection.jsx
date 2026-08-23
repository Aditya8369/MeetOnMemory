import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Download,
  FileArchive,
  ShieldCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Info,
  FileJson,
} from "lucide-react";
import { toast } from "react-toastify";
import { userApi } from "../../services/userApi.js";
import ConfirmModal from "../ConfirmModal.jsx";

const POLL_INTERVAL_MS = 4000;
const MAX_POLL_ATTEMPTS = 30; // 2 minutes max polling

const DataExportSection = () => {
  const [exportStatus, setExportStatus] = useState({
    status: "idle", // 'idle' | 'processing' | 'completed' | 'failed'
    lastExportRequestedAt: null,
    canRequest: true,
    cooldownRemainingMs: 0,
    cooldownHoursRemaining: 0,
    downloadUrl: null,
    downloadToken: null,
    expiresAt: null,
    error: null,
  });
  const [loading, setLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const pollAttemptsRef = useRef(0);
  const pollTimerRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await userApi.getDataExportStatus();
      if (response.data?.success && response.data?.data) {
        const data = response.data.data;
        setExportStatus(data);
        return data;
      }
    } catch (error) {
      console.error("Error fetching data export status:", error);
    } finally {
      setLoading(false);
    }
    return null;
  }, []);

  // Polling logic when status is processing
  const startPolling = useCallback(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollAttemptsRef.current = 0;

    pollTimerRef.current = setInterval(async () => {
      pollAttemptsRef.current += 1;
      const data = await fetchStatus();

      if (
        !data ||
        data.status === "completed" ||
        data.status === "failed" ||
        pollAttemptsRef.current >= MAX_POLL_ATTEMPTS
      ) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
        if (data?.status === "completed") {
          toast.success("Your data export is ready to download!");
        } else if (data?.status === "failed") {
          toast.error(data.error || "Data export failed to generate.");
        }
      }
    }, POLL_INTERVAL_MS);
  }, [fetchStatus]);

  useEffect(() => {
    fetchStatus().then((data) => {
      if (data?.status === "processing") {
        startPolling();
      }
    });

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [fetchStatus, startPolling]);

  const handleRequestExport = async () => {
    try {
      setIsRequesting(true);
      const response = await userApi.requestDataExport();

      if (response.data?.success) {
        toast.success(
          "Data export request submitted. Generating your archive...",
        );
        setIsConfirmModalOpen(false);
        setExportStatus((prev) => ({
          ...prev,
          status: "processing",
          canRequest: false,
          error: null,
        }));
        startPolling();
      }
    } catch (error) {
      console.error("Error requesting data export:", error);
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to request data export. Please try again.";
      toast.error(message);
      fetchStatus();
    } finally {
      setIsRequesting(false);
      setIsConfirmModalOpen(false);
    }
  };

  const handleDownload = () => {
    if (!exportStatus.downloadUrl) {
      toast.error("Download link is unavailable or has expired.");
      return;
    }

    // Direct download trigger via server endpoint
    window.location.assign(exportStatus.downloadUrl);
  };

  const formatExpiryTime = (isoString) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  return (
    <div
      role="region"
      aria-label="Privacy and Data Portability"
      data-testid="data-export-section"
      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm fade-in-up"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Data Portability & Privacy (GDPR)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Request and download an archive of your personal account data
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6 text-slate-400 gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-xs">Loading export status...</span>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Data Explanation Panel */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-150 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-2">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  What is included in your export package?
                </p>
                <p className="text-slate-500 dark:text-slate-400">
                  In compliance with GDPR Article 20 (Right to data portability),
                  your export archive contains structured JSON files including:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 pl-6">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <FileJson className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Account Profile</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <FileJson className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>Meeting History</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <FileJson className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                <span>Team Memberships</span>
              </div>
            </div>
          </div>

          {/* Status Display Banners */}
          {exportStatus.status === "processing" && (
            <div
              data-testid="export-processing-state"
              className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 flex items-center justify-between gap-3 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
                <div>
                  <p className="text-xs font-bold text-blue-900 dark:text-blue-200">
                    Preparing Data Export Archive...
                  </p>
                  <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">
                    Your meetings, transcripts, and profile data are being packaged. This usually takes under a minute.
                  </p>
                </div>
              </div>
            </div>
          )}

          {exportStatus.status === "completed" && exportStatus.downloadUrl && (
            <div
              data-testid="export-completed-state"
              className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    Your Data Package is Ready for Download
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                    Download your full account archive (.zip).
                    {exportStatus.expiresAt && (
                      <span className="block sm:inline sm:ml-1 font-medium">
                        Expires on {formatExpiryTime(exportStatus.expiresAt)} (24h retention).
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                data-testid="download-export-btn"
                onClick={handleDownload}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download Archive (.zip)
              </button>
            </div>
          )}

          {exportStatus.status === "failed" && (
            <div
              data-testid="export-failed-state"
              className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-red-900 dark:text-red-200">
                  Data Export Generation Failed
                </p>
                <p className="text-[11px] text-red-700 dark:text-red-300 mt-0.5">
                  {exportStatus.error || "An unexpected error occurred while compiling your data package."}
                </p>
              </div>
            </div>
          )}

          {/* Action Row & Retention / Cooldown Policies */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Exports are retained securely for 24 hours. Rate limited to 1 request per 24 hours.</span>
              </div>
              {!exportStatus.canRequest && exportStatus.cooldownHoursRemaining > 0 && (
                <p className="text-amber-600 dark:text-amber-400 font-medium">
                  Next export request available in approximately {exportStatus.cooldownHoursRemaining} hour(s).
                </p>
              )}
            </div>

            <button
              type="button"
              data-testid="request-export-btn"
              disabled={!exportStatus.canRequest || exportStatus.status === "processing" || isRequesting}
              onClick={() => setIsConfirmModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
            >
              {isRequesting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileArchive className="w-3.5 h-3.5" />
              )}
              <span>
                {exportStatus.status === "processing"
                  ? "Compiling..."
                  : "Request Data Export"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleRequestExport}
        title="Request Personal Data Export"
        message="Are you sure you want to request a full export of your personal data? A comprehensive ZIP archive containing your profile, uploaded meetings, and memberships will be generated. The file will be available for download for 24 hours."
        confirmText="Request Export"
        cancelText="Cancel"
        isLoading={isRequesting}
        loadingText="Submitting Request..."
        variant="primary"
      />
    </div>
  );
};

export default DataExportSection;
