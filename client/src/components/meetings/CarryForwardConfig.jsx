import React, { useState, useEffect } from "react";
import carryForwardApi from "../../services/carryForwardApi";
import { ListRestart, Lock, History, Eye, Settings } from "lucide-react";

export default function CarryForwardConfig({
  seriesId,
  currentMeetingId,
  meetingId, // supports both prop styles
  userRole,
  onApplySuccess,
}) {
  const activeMeetingId = currentMeetingId || meetingId;

  const [config, setConfig] = useState(null);
  const [previewItems, setPreviewItems] = useState([]);
  const [historyRuns, setHistoryRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorText, setErrorText] = useState(null);
  const [successText, setSuccessText] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Enforce Series Ownership Authorization Rules
  const isAuthorized = userRole === "host" || userRole === "owner";

  useEffect(() => {
    if (activeMeetingId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMeetingId, seriesId]);

  const fetchData = async () => {
    setLoading(true);
    setErrorText(null);
    try {
      const [configRes, previewRes, historyRes] = await Promise.all([
        carryForwardApi.getConfig(seriesId),
        carryForwardApi.getMeetingPreview(activeMeetingId),
        carryForwardApi.getHistory(seriesId),
      ]);

      if (configRes.data.success) {
        setConfig(configRes.data.config.carryForwardRules);
      }
      if (previewRes.data.success) {
        setPreviewItems(previewRes.data.items || []);
      }
      if (historyRes.data.success) {
        setHistoryRuns(historyRes.data.history || []);
      }
    } catch (err) {
      setErrorText(
        err.response?.data?.message ||
          "A network error occurred while syncing series configurations.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key) => {
    if (!isAuthorized) {
      setErrorText(
        "Access Denied: You lack permissions to modify series parameters.",
      );
      return;
    }
    const updatedRules = { ...config, [key]: !config[key] };
    setConfig(updatedRules);
    try {
      await carryForwardApi.updateConfig(seriesId, updatedRules);
      const previewRes =
        await carryForwardApi.getMeetingPreview(activeMeetingId);
      if (previewRes.data.success) {
        setPreviewItems(previewRes.data.items || []);
      }
    } catch (error) {
      console.error(error);
      setErrorText("Failed to update rules");
      setConfig(config); // Revert on failure
    }
  };

  const handleMaxChange = async (e) => {
    if (!isAuthorized) {
      setErrorText(
        "Access Denied: You lack permissions to modify series parameters.",
      );
      return;
    }
    const val = parseInt(e.target.value, 10);
    const updatedRules = { ...config, maxCarriedItems: val };
    setConfig(updatedRules);
    try {
      await carryForwardApi.updateConfig(seriesId, updatedRules);
      const previewRes =
        await carryForwardApi.getMeetingPreview(activeMeetingId);
      if (previewRes.data.success) {
        setPreviewItems(previewRes.data.items || []);
      }
    } catch (error) {
      console.error(error);
      setErrorText("Failed to update limit");
    }
  };

  const handleApplyCarryForward = async () => {
    if (!isAuthorized) {
      setErrorText(
        "Authorization Failure: Only series owners can migrate open milestones.",
      );
      return;
    }

    setActionLoading(true);
    setErrorText(null);
    setSuccessText(null);
    setShowConfirmModal(false);

    try {
      const { data } = await carryForwardApi.applyMeetingCarryForward(
        activeMeetingId,
        seriesId,
      );
      if (data.success) {
        setSuccessText(
          `Success! Migrated ${data.migratedCount} item(s) to the next instance: "${data.nextMeetingTitle}".`,
        );
        setPreviewItems([]); // Clear preview deck on success

        const historyRes = await carryForwardApi.getHistory(seriesId);
        if (historyRes.data.success) {
          setHistoryRuns(historyRes.data.history || []);
        }

        if (onApplySuccess) {
          onApplySuccess();
        }
      }
    } catch (err) {
      setErrorText(
        err.response?.data?.message ||
          "Failed executing rollover workflow pipelines.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
      {/* Configuration Header Box */}
      <div className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <ListRestart className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Series Rollover Manager
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Automate migration tracking for open action requirements and
            unresolved items.
          </p>
        </div>

        <button
          onClick={() => {
            if (!isAuthorized) {
              setErrorText(
                "Access Denied: You lack permissions to modify series parameters.",
              );
              return;
            }
            setShowConfirmModal(true);
          }}
          disabled={
            loading ||
            actionLoading ||
            previewItems.length === 0 ||
            !isAuthorized
          }
          type="button"
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm whitespace-nowrap cursor-pointer"
        >
          🔄 Apply Rollover ({previewItems.length})
        </button>
      </div>

      {/* Exception/Success Feedback Alerts Panel */}
      {errorText && (
        <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-450 text-xs font-medium rounded-xl flex items-center gap-2">
          <span>⚠️</span>
          <div>{errorText}</div>
        </div>
      )}

      {successText && (
        <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-2">
          <span>🎉</span>
          <div>{successText}</div>
        </div>
      )}

      <div className="space-y-6">
        {/* SECTION 1: CONFIGURATION SWITCHES */}
        {config && (
          <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl space-y-4">
            <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
              <Settings className="w-3.5 h-3.5" />
              Rollover Rules Configuration
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-700 dark:text-slate-300 font-bold">
                  Include Unfinished Agenda
                </span>
                <button
                  onClick={() => handleToggle("includeUnfinishedAgenda")}
                  disabled={!isAuthorized}
                  className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none ${
                    config.includeUnfinishedAgenda
                      ? "bg-indigo-600"
                      : "bg-slate-300 dark:bg-slate-600"
                  } ${!isAuthorized ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                      config.includeUnfinishedAgenda
                        ? "translate-x-5"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-700 dark:text-slate-300 font-bold">
                  Include Open Action Items
                </span>
                <button
                  onClick={() => handleToggle("includeOpenActionItems")}
                  disabled={!isAuthorized}
                  className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none ${
                    config.includeOpenActionItems
                      ? "bg-indigo-600"
                      : "bg-slate-300 dark:bg-slate-600"
                  } ${!isAuthorized ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                      config.includeOpenActionItems
                        ? "translate-x-5"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-700 dark:text-slate-300 font-bold">
                  Max Items limit
                </span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={config.maxCarriedItems}
                  onChange={handleMaxChange}
                  disabled={!isAuthorized}
                  className="border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 w-20 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs text-center font-bold font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: PREVIEW AND HISTORY COLS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* COLUMN 1: LIVE PREVIEW ZONE */}
          <div>
            <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-3">
              <Eye className="w-3.5 h-3.5" />
              Open Items Preview
            </h4>
            {previewItems.length === 0 ? (
              <div className="p-6 bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center text-xs text-slate-400 italic">
                No active backlog items require forward migration.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {previewItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:shadow-xs transition duration-150"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block truncate">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider mt-0.5 block">
                        Owner: {item.assigneeName || "Unassigned"}
                      </span>
                    </div>
                    <span
                      className={`text-[9px] font-black uppercase border px-2 py-0.5 rounded ${
                        item.type === "Action Item"
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-900/40"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900/40"
                      }`}
                    >
                      {item.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* COLUMN 2: HISTORICAL LOG TRACKER */}
          <div>
            <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-3">
              <History className="w-3.5 h-3.5" />
              Past Carry-Forward Logs
            </h4>
            {historyRuns.length === 0 ? (
              <div className="p-6 bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center text-xs text-slate-400 italic">
                No historical rollover runs logged for this recurring chain.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {historyRuns.map((run, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-xl text-xs flex justify-between items-center hover:shadow-xs transition duration-150"
                  >
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 font-mono text-[10px] font-bold block">
                        {new Date(run.executedAt).toLocaleString()}
                      </span>
                      <span className="text-slate-600 dark:text-slate-350 mt-1 block">
                        Moved to: <strong>{run.targetMeetingTitle}</strong>
                      </span>
                    </div>
                    <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/30 px-2 py-0.5 rounded-lg text-[10px]">
                      +{run.itemsCount} items
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CONFIRMATION ACTION MODAL GUARD */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scaleUp">
            <h4 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Confirm Items Carry-Forward
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-450 mt-2 leading-relaxed">
              Are you sure you want to carry forward these{" "}
              <strong className="text-slate-900 dark:text-white font-bold">
                {previewItems.length} open items
              </strong>
              ? This action will copy all unchecked tasks directly onto the
              agenda stack of the next scheduled meeting occurrence.
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 border border-slate-200 dark:border-slate-850 rounded-xl text-xs font-bold text-slate-550 hover:bg-slate-50 dark:hover:bg-slate-900 tracking-wide transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyCarryForward}
                disabled={actionLoading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow cursor-pointer transition-all"
              >
                {actionLoading ? "Migrating..." : "Confirm & Apply"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
