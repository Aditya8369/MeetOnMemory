import React, { useState, useEffect, useContext, useCallback } from "react";
import Navbar from "../../components/Navbar.jsx";
import AppContent from "../../context/AppContent.js";
import { organizationApi } from "../../services";
import { toast } from "react-toastify";
import {
  FileText,
  Filter,
  Calendar,
  User,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Activity,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";

const ACTION_COLORS = {
  ORGANIZATION_MEMBER_INVITED:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300",
  ORGANIZATION_INVITE_ACCEPTED:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300",
  MEMBER_ROLE_CHANGED:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300",
  MEMBER_REMOVED:
    "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300",
  MEETING_DELETED:
    "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300",
  POLICY_DELETED:
    "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300",
  POLICY_PUBLISHED:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300",
};

const AuditLogViewer = () => {
  const { userData } = useContext(AppContent);
  const orgId = userData?.organization?._id || userData?.organization;
  const userRole = userData?.role || userData?.organizationRole || "member";
  const canExport = ["admin", "owner"].includes(userRole);

  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [pageSize, setPageSize] = useState(15);
  const [loading, setLoading] = useState(true);
  const [exportingFormat, setExportingFormat] = useState(null); // 'csv' | 'xlsx' | null
  const [asyncExport, setAsyncExport] = useState(null); // { id, status, format, error } | null

  const [filters, setFilters] = useState({
    action: "",
    startDate: "",
    endDate: "",
  });

  const loadLogs = useCallback(
    async (page = 1, limit = pageSize) => {
      if (!orgId) return;
      setLoading(true);
      try {
        const res = await organizationApi.getAuditLogs(orgId, {
          page,
          limit,
          action: filters.action || undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
        });

        if (res.data?.success) {
          setLogs(res.data.logs || []);
          setPagination(
            res.data.pagination || {
              page,
              total: res.data.logs?.length || 0,
              pages: Math.ceil((res.data.logs?.length || 0) / limit) || 1,
            },
          );
        }
      } catch (err) {
        console.error("Failed to load audit logs", err);
        toast.error("Failed to load audit logs.");
      } finally {
        setLoading(false);
      }
    },
    [orgId, filters, pageSize],
  );

  useEffect(() => {
    loadLogs(1, pageSize);
  }, [loadLogs, pageSize]);

  // Polling for large asynchronous exports (#2034)
  useEffect(() => {
    if (
      !asyncExport?.id ||
      !orgId ||
      asyncExport.status === "completed" ||
      asyncExport.status === "failed"
    ) {
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        const res = await organizationApi.getAuditLogExport(
          orgId,
          asyncExport.id,
        );
        if (res.data?.success && res.data.export) {
          const { status, error } = res.data.export;
          setAsyncExport((prev) => ({ ...prev, status, error }));

          if (status === "completed") {
            clearInterval(intervalId);
            toast.success("Audit log export ready! Downloading...");
            const fileRes = await organizationApi.downloadAuditLogExport(
              orgId,
              asyncExport.id,
            );
            const blob = new Blob([fileRes.data]);
            const timestamp = new Date().toISOString().slice(0, 10);
            triggerDownloadBlob(
              blob,
              `audit-logs-${timestamp}.${asyncExport.format}`,
            );
          } else if (status === "failed") {
            clearInterval(intervalId);
            toast.error(error || "Audit log background export failed.");
          }
        }
      } catch (pollErr) {
        console.error("Error polling audit log export status:", pollErr);
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [asyncExport?.id, asyncExport?.status, asyncExport?.format, orgId]);

  const triggerDownloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExport = async (format) => {
    if (!orgId) return;
    if (!canExport) {
      toast.error(
        "Only administrators and organization owners can export audit logs.",
      );
      return;
    }

    setExportingFormat(format);
    try {
      const res = await organizationApi.exportAuditLogs(orgId, {
        format,
        action: filters.action || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });

      // Check if response is JSON (202 async queued export)
      const contentType = res.headers?.["content-type"] || "";
      if (
        contentType.includes("application/json") ||
        res.status === 202 ||
        (res.data instanceof Blob &&
          res.data.type?.includes("application/json"))
      ) {
        let json;
        if (res.data instanceof Blob) {
          const text = await res.data.text();
          json = JSON.parse(text);
        } else {
          json = res.data;
        }

        if (json.data?.export?.id) {
          setAsyncExport({
            id: json.data.export.id,
            status: json.data.export.status || "pending",
            format,
          });
          toast.info(
            "Large audit log export queued in background. Tracking progress...",
          );
          return;
        }
      }

      // Direct file download
      const blob = new Blob([res.data], {
        type:
          format === "csv"
            ? "text/csv;charset=utf-8;"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const timestamp = new Date().toISOString().slice(0, 10);
      triggerDownloadBlob(blob, `audit-logs-${timestamp}.${format}`);
      toast.success(
        `Audit logs exported as ${format.toUpperCase()} successfully.`,
      );
    } catch (err) {
      console.error(`Failed to export audit logs as ${format}:`, err);
      toast.error(
        err.response?.data?.message ||
          `Failed to export audit logs as ${format.toUpperCase()}.`,
      );
    } finally {
      setExportingFormat(null);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pt-20">
      <Navbar />

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              Organization Audit Trail
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Immutable audit record of sensitive administrative actions, role
              changes, and member operations.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Export CSV CTA */}
            <button
              type="button"
              data-testid="export-csv-btn"
              disabled={!canExport || exportingFormat !== null}
              onClick={() => handleExport("csv")}
              title={
                canExport
                  ? "Export filtered audit logs as CSV"
                  : "Admin permissions required to export"
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
            >
              {exportingFormat === "csv" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              ) : (
                <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              )}
              <span>Export CSV</span>
            </button>

            {/* Export XLSX CTA */}
            <button
              type="button"
              data-testid="export-xlsx-btn"
              disabled={!canExport || exportingFormat !== null}
              onClick={() => handleExport("xlsx")}
              title={
                canExport
                  ? "Export filtered audit logs as Excel (XLSX)"
                  : "Admin permissions required to export"
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
            >
              {exportingFormat === "xlsx" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              )}
              <span>Export XLSX</span>
            </button>

            <button
              type="button"
              onClick={() => loadLogs(pagination.page, pageSize)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>
        </div>

        {/* Async Export Progress Card (#2034) */}
        {asyncExport && (
          <div
            data-testid="async-export-tracker"
            className="p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-3">
              {asyncExport.status === "completed" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : asyncExport.status === "failed" ? (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              ) : (
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
              )}
              <div>
                <p className="font-bold text-slate-900 dark:text-white">
                  {asyncExport.status === "completed"
                    ? `Audit log ${asyncExport.format?.toUpperCase()} export completed!`
                    : asyncExport.status === "failed"
                      ? `Export failed: ${asyncExport.error || "Unknown error"}`
                      : `Preparing large audit log ${asyncExport.format?.toUpperCase()} export in background...`}
                </p>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  {asyncExport.status === "completed"
                    ? "Your download should begin automatically."
                    : "You can continue working. The export file will download as soon as it is processed."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAsyncExport(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
              title="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filter Controls */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter by Action
            </label>
            <input
              type="text"
              name="action"
              placeholder="e.g. MEMBER_ROLE_CHANGED"
              value={filters.action}
              onChange={handleFilterChange}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Start Date
            </label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> End Date
            </label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          {loading ? (
            <div className="p-12 text-center text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Fetching audit log entries...
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No audit log entries recorded yet for this organization.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Actor</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Target Entity</th>
                    <th className="p-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {logs.map((log) => (
                    <tr
                      key={log._id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs"
                    >
                      <td className="p-4 text-slate-500 font-mono whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {log.actor?.name || log.actor?.email || "System"}
                        </div>
                      </td>
                      <td className="p-4 font-mono">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            ACTION_COLORS[log.action] ||
                            "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400 font-medium">
                        {log.entity || log.targetType || "—"}
                      </td>
                      <td className="p-4 text-slate-500 font-mono max-w-xs truncate">
                        {JSON.stringify(log.details || log.metadata || {})}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination & Page Size Footer (#1306) */}
          {logs.length > 0 && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-slate-500 dark:text-slate-400">
                  Page {pagination.page} of {pagination.pages || 1} (
                  {pagination.total || logs.length} total logs)
                </span>
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <span>Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    aria-label="Select logs per page"
                    className="px-2 py-1 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={pagination.page <= 1}
                  onClick={() => loadLogs(pagination.page - 1, pageSize)}
                  className="p-1.5 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label="Next page"
                  disabled={pagination.page >= (pagination.pages || 1)}
                  onClick={() => loadLogs(pagination.page + 1, pageSize)}
                  className="p-1.5 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogViewer;
