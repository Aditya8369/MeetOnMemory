import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { knowledgeApi } from "../../services/knowledgeApi";
import {
  AlertTriangle,
  ShieldAlert,
  Loader2,
  ScanSearch,
  CheckCircle2,
  XCircle,
  PenLine,
  Sparkles,
  RefreshCw,
} from "lucide-react";

const MeetingContradictionInspector = ({ meetingId, onResolved }) => {
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [customValues, setCustomValues] = useState({});

  const loadMeetingConflicts = useCallback(async () => {
    if (!meetingId) return;
    setLoading(true);
    try {
      const res = await knowledgeApi.getMeetingConflicts(meetingId);
      if (res.data?.success) {
        setConflicts(res.data.conflicts || []);
      }
    } catch (err) {
      console.error("Failed to fetch meeting conflicts:", err);
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    loadMeetingConflicts();
  }, [loadMeetingConflicts]);

  const handleScanMeeting = async () => {
    if (!meetingId) return;
    setScanning(true);
    try {
      const res = await knowledgeApi.scanMeetingConflicts(meetingId, {
        dryRun: false,
      });
      if (res.data?.success) {
        const total = res.data.report?.totalConflictsFound || 0;
        toast.success(
          total > 0
            ? `Contradiction scan complete — ${total} contradiction${total === 1 ? "" : "s"} identified.`
            : "Contradiction scan complete — no knowledge conflicts found.",
        );
        await loadMeetingConflicts();
      }
    } catch (err) {
      console.error("Error scanning meeting conflicts:", err);
      toast.error(
        err.response?.data?.message || "Failed to scan meeting contradictions.",
      );
    } finally {
      setScanning(false);
    }
  };

  const handleResolve = async (conflictId, resolutionType, extra = {}) => {
    setResolvingId(conflictId);
    try {
      const res = await knowledgeApi.resolveConflict(conflictId, {
        resolutionType,
        ...extra,
      });
      if (res.data?.success) {
        toast.success("Knowledge contradiction resolved.");
        setConflicts((prev) => prev.filter((c) => c._id !== conflictId));
        if (onResolved) onResolved(conflictId);
      }
    } catch (err) {
      console.error("Failed to resolve conflict:", err);
      toast.error(err.response?.data?.message || "Failed to resolve conflict.");
    } finally {
      setResolvingId(null);
    }
  };

  if (loading) {
    return (
      <div
        data-testid="meeting-contradiction-loading"
        className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-center gap-2 text-sm text-gray-500"
      >
        <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
        Checking for knowledge contradictions...
      </div>
    );
  }

  return (
    <div data-testid="meeting-contradiction-inspector" className="space-y-4">
      {/* Contradictions Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Knowledge Contradictions
              <span
                data-testid="contradiction-badge"
                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  conflicts.length > 0
                    ? "bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200"
                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                }`}
              >
                {conflicts.length}{" "}
                {conflicts.length === 1 ? "conflict" : "conflicts"}
              </span>
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              Identifies statements in this meeting that conflict with existing
              organizational knowledge.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleScanMeeting}
          disabled={scanning}
          data-testid="scan-meeting-btn"
          className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60 shrink-0"
        >
          {scanning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ScanSearch className="w-3.5 h-3.5" />
          )}
          Scan Contradictions
        </button>
      </div>

      {/* Conflicts List */}
      {conflicts.length === 0 ? (
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-center space-y-1">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            No knowledge contradictions detected for this meeting.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            All decisions and action items align cleanly with stored
            organizational records.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {conflicts.map((conflict) => (
            <div
              key={conflict._id}
              data-testid={`conflict-card-${conflict._id}`}
              className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-white dark:bg-gray-900 shadow-sm space-y-3"
            >
              {/* Conflict Explanation & Confidence */}
              <div className="flex items-start justify-between gap-3 pb-2 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>AI Confidence: {conflict.confidence}%</span>
                </div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-gray-400">
                  {conflict.modelType}
                </span>
              </div>

              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                {conflict.explanation}
              </p>

              {/* Side-by-side statement comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(conflict.memberSnapshots || []).map((member, idx) => {
                  const isCurrentMeetingMember =
                    member.sourceMeetingId?.toString() ===
                      meetingId.toString() ||
                    member.meetingId?.toString() === meetingId.toString() ||
                    member.meeting?.toString() === meetingId.toString();

                  return (
                    <div
                      key={member.memoryId || idx}
                      className={`p-3 rounded-xl border flex flex-col justify-between space-y-2 ${
                        isCurrentMeetingMember
                          ? "bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/50"
                          : "bg-gray-50/50 border-gray-200 dark:bg-gray-800/40 dark:border-gray-700"
                      }`}
                    >
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                          {isCurrentMeetingMember
                            ? "This Meeting's Statement"
                            : "Existing Org Knowledge Record"}
                        </span>
                        <p className="text-xs text-gray-900 dark:text-white font-medium">
                          "{member.text}"
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleResolve(conflict._id, "kept_member", {
                            keptMemoryId: member.memoryId,
                          })
                        }
                        disabled={resolvingId === conflict._id}
                        data-testid={`keep-member-btn-${member.memoryId}`}
                        className="w-full mt-2 py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        {resolvingId === conflict._id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        {isCurrentMeetingMember
                          ? "Keep Meeting Statement"
                          : "Keep Stored Knowledge"}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Custom correction / Dismiss Toolbar */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Enter custom resolved text..."
                  value={customValues[conflict._id] || ""}
                  onChange={(e) =>
                    setCustomValues((prev) => ({
                      ...prev,
                      [conflict._id]: e.target.value,
                    }))
                  }
                  className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-amber-500"
                  data-testid={`custom-input-${conflict._id}`}
                />
                <button
                  type="button"
                  onClick={() =>
                    handleResolve(conflict._id, "custom_value", {
                      customValue: customValues[conflict._id] || "",
                    })
                  }
                  disabled={
                    resolvingId === conflict._id || !customValues[conflict._id]
                  }
                  data-testid={`save-custom-btn-${conflict._id}`}
                  className="px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <PenLine className="w-3.5 h-3.5" />
                  Save Correction
                </button>

                <button
                  type="button"
                  onClick={() => handleResolve(conflict._id, "dismissed")}
                  disabled={resolvingId === conflict._id}
                  data-testid={`dismiss-btn-${conflict._id}`}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MeetingContradictionInspector;
