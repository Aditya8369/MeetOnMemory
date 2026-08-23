import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import {
  Mail,
  Eye,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  History,
  Send,
  RefreshCw,
} from "lucide-react";
import apiClient from "../../services/apiClient.js";

const DigestActions = ({ meetingId, onStatusUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [fetchingStatus, setFetchingStatus] = useState(false);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [statusData, setStatusData] = useState(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setFetchingStatus(true);
      const { data } = await apiClient.get(
        `/api/meetings/${meetingId}/digest/status`,
      );
      if (data.success) {
        setStatusData(data.data);
        if (onStatusUpdate) onStatusUpdate(data.data);
      }
    } catch (err) {
      console.error("Error fetching digest status:", err);
    } finally {
      setFetchingStatus(false);
    }
  }, [meetingId, onStatusUpdate]);

  useEffect(() => {
    if (meetingId) {
      fetchStatus();
    }
  }, [meetingId, fetchStatus]);

  const handleResend = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.post(
        `/api/meetings/${meetingId}/digest/resend`,
      );
      if (data.success) {
        toast.success(data.message || "Email digest resent successfully");
        fetchStatus();
      } else {
        toast.error(data.message || "Failed to resend email digest");
      }
    } catch (err) {
      console.error("Error resending digest:", err);
      toast.error(
        err.response?.data?.message || "Failed to resend email digest",
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    try {
      setPreviewLoading(true);
      setModalOpen(true);
      const { data } = await apiClient.get(
        `/api/meetings/${meetingId}/digest/preview`,
      );
      setPreviewHtml(data);
    } catch (err) {
      console.error("Error fetching preview:", err);
      toast.error("Failed to load digest preview");
      setModalOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case "delivered":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            <AlertCircle className="w-3.5 h-3.5" /> Failed
          </span>
        );
      case "pending":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-500" />
            Meeting Digest Delivery Status
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor email delivery state, view preview, and manually trigger
            resends.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStatus}
            disabled={fetchingStatus}
            className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Refresh Status"
          >
            <RefreshCw
              className={`w-4 h-4 ${fetchingStatus ? "animate-spin" : ""}`}
            />
          </button>
          <button
            onClick={handlePreview}
            disabled={previewLoading || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:text-blue-600 transition-colors disabled:opacity-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-blue-400"
          >
            {previewLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
            Preview
          </button>
          <button
            onClick={handleResend}
            disabled={loading || previewLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Resend Digest
          </button>
        </div>
      </div>

      {/* Summary Status Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Current State
            </span>
            <div className="mt-1">
              {renderStatusBadge(statusData?.lastStatus || "pending")}
            </div>
          </div>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Last Delivered
          </span>
          <div className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-1">
            {statusData?.lastDeliveredAt
              ? new Date(statusData.lastDeliveredAt).toLocaleString()
              : "No delivery recorded"}
          </div>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Deliveries / Failures
            </span>
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">
              {statusData?.totalDelivered || 0} sent /{" "}
              {statusData?.totalFailed || 0} failed
            </div>
          </div>
          <button
            onClick={() => setHistoryExpanded(!historyExpanded)}
            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            <History className="w-3.5 h-3.5" />
            {historyExpanded ? "Hide" : "History"}
          </button>
        </div>
      </div>

      {/* History Log Section */}
      {historyExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-slate-400" />
            Recent Delivery History
          </h4>

          {statusData?.history?.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto rounded-lg border border-slate-100 dark:border-slate-800">
              {statusData.history.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {renderStatusBadge(item.status)}
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {item.recipient?.email || "Participant"}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
                    {item.errorMessage && (
                      <span
                        className="text-rose-500 truncate max-w-[180px]"
                        title={item.errorMessage}
                      >
                        {item.errorMessage}
                      </span>
                    )}
                    <span>
                      {new Date(item.deliveredAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-slate-800">
              No previous delivery attempts recorded for this meeting.
            </div>
          )}
        </div>
      )}

      {/* Email Preview Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-500" />
                Email Digest Preview
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-slate-50 dark:bg-slate-950">
              {previewLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : previewHtml ? (
                <div
                  className="bg-white mx-auto shadow-sm border border-slate-200 rounded-lg overflow-hidden"
                  style={{ maxWidth: "600px" }}
                >
                  <iframe
                    title="Email Preview"
                    srcDoc={previewHtml}
                    className="w-full min-h-[500px]"
                    style={{ border: "none" }}
                  />
                </div>
              ) : (
                <div className="text-center text-slate-500 py-12">
                  Preview not available.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DigestActions;
