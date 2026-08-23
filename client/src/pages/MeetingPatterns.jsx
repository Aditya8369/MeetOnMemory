import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import {
  AlertTriangle,
  TrendingDown,
  Clock,
  CheckCircle,
  Users,
  Target,
  FileText,
  RefreshCw,
  Check,
  X,
  PlusCircle,
  Settings,
  History,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import axios from "../services/apiClient";
import { toast } from "react-toastify";

const ICONS = {
  overtime_trend: <Clock className="w-5 h-5" />,
  declining_attendance: <Users className="w-5 h-5" />,
  agenda_bloat: <FileText className="w-5 h-5" />,
  stale_action_items: <Target className="w-5 h-5" />,
};

const COLORS = {
  info: "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-800",
  warning:
    "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/30 dark:border-amber-800",
  critical:
    "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/30 dark:border-red-800",
};

const TITLES = {
  overtime_trend: "Overtime Trend Detected",
  declining_attendance: "Declining Attendance",
  agenda_bloat: "Agenda Bloat",
  stale_action_items: "Stale Action Items",
};

const MeetingPatterns = () => {
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [activeTab, setActiveTab] = useState("active");

  // Modal / Action form states
  const [selectedPatternForTask, setSelectedPatternForTask] = useState(null);
  const [taskText, setTaskText] = useState("");
  const [taskPriority, setTaskPriority] = useState("high");
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const [selectedPatternForRule, setSelectedPatternForRule] = useState(null);
  const [ruleName, setRuleName] = useState("");
  const [triggerEvent, setTriggerEvent] = useState("mom.generated");
  const [actionType, setActionType] = useState("email");
  const [isConfiguringRule, setIsConfiguringRule] = useState(false);

  const fetchPatterns = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/patterns");
      setPatterns(res.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to load meeting patterns.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatterns();
  }, []);

  const handleManualScan = async () => {
    try {
      setScanning(true);
      await axios.post("/api/patterns/scan");
      await fetchPatterns();
      toast.success("Manual pattern scan completed successfully.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to run manual scan.");
    } finally {
      setScanning(false);
    }
  };

  const handleAcknowledge = async (id) => {
    try {
      const res = await axios.patch(`/api/patterns/${id}/acknowledge`);
      setPatterns(
        patterns.map((p) =>
          p._id === id ? res.data || { ...p, status: "acknowledged" } : p,
        ),
      );
      toast.success("Pattern acknowledged.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to acknowledge pattern.");
    }
  };

  const handleDismiss = async (id) => {
    try {
      await axios.patch(`/api/patterns/${id}/dismiss`);
      setPatterns(patterns.filter((p) => p._id !== id));
      toast.success("Pattern dismissed.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to dismiss pattern.");
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!selectedPatternForTask) return;

    try {
      setIsCreatingTask(true);
      const res = await axios.post(
        `/api/patterns/${selectedPatternForTask._id}/create-task`,
        {
          taskText: taskText.trim() || undefined,
          priority: taskPriority,
        },
      );
      if (res.data?.pattern) {
        setPatterns(
          patterns.map((p) =>
            p._id === selectedPatternForTask._id ? res.data.pattern : p,
          ),
        );
      }
      toast.success("Task generated from pattern!");
      setSelectedPatternForTask(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate task.");
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleConfigureAutomation = async (e) => {
    e.preventDefault();
    if (!selectedPatternForRule) return;

    try {
      setIsConfiguringRule(true);
      const res = await axios.post(
        `/api/patterns/${selectedPatternForRule._id}/configure-automation`,
        {
          ruleName: ruleName.trim() || undefined,
          triggerEvent,
          actionType,
        },
      );
      if (res.data?.pattern) {
        setPatterns(
          patterns.map((p) =>
            p._id === selectedPatternForRule._id ? res.data.pattern : p,
          ),
        );
      }
      toast.success("Automation rule configured from pattern!");
      setSelectedPatternForRule(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to configure automation rule.");
    } finally {
      setIsConfiguringRule(false);
    }
  };

  const displayedPatterns = patterns.filter((p) => {
    if (activeTab === "active") return p.status === "active";
    if (activeTab === "acknowledged") return p.status === "acknowledged";
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors duration-200 dark:bg-gray-900 dark:text-gray-100">
      <Navbar />
      <div className="max-w-6xl mx-auto p-6 pt-28">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2.5">
              <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400">
                <TrendingDown className="w-6 h-6" />
              </div>
              Actionable Meeting Patterns
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xl">
              AI analysis detecting organizational anti-patterns with one-click
              action pathways to auto-generate tasks or trigger automation
              rules.
            </p>
          </div>
          <button
            onClick={handleManualScan}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`}
            />
            {scanning ? "Scanning Org..." : "Run Manual Scan"}
          </button>
        </div>

        <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab("active")}
            className={`pb-2 px-2 text-xs font-bold transition-colors ${
              activeTab === "active"
                ? "border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            Active Patterns (
            {patterns.filter((p) => p.status === "active").length})
          </button>
          <button
            onClick={() => setActiveTab("acknowledged")}
            className={`pb-2 px-2 text-xs font-bold transition-colors ${
              activeTab === "acknowledged"
                ? "border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            Acknowledged & Remediated (
            {patterns.filter((p) => p.status === "acknowledged").length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-xs">
            Analyzing organization patterns...
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-xl text-xs font-semibold border border-red-200 dark:border-red-900/50">
            {error}
          </div>
        ) : displayedPatterns.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              All Clear
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              No anti-patterns detected under this view.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {displayedPatterns.map((pattern) => (
              <div
                key={pattern._id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xs overflow-hidden"
              >
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-xl border shrink-0 ${COLORS[pattern.severity]}`}
                    >
                      {ICONS[pattern.type] || (
                        <AlertTriangle className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">
                          {TITLES[pattern.type] || pattern.type}
                        </h3>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            pattern.status === "active"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                          }`}
                        >
                          {pattern.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Detected across {pattern.affectedMeetings?.length || 0}{" "}
                        recent meetings
                      </p>
                    </div>
                  </div>

                  {/* Action Pathways */}
                  <div className="flex items-center gap-2 self-end md:self-center flex-wrap">
                    <button
                      onClick={() => {
                        setSelectedPatternForTask(pattern);
                        setTaskText(
                          `[Remediate ${pattern.type.replace(/_/g, " ")}] ${pattern.aiRecommendation || ""}`,
                        );
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Generate Task
                    </button>

                    <button
                      onClick={() => {
                        setSelectedPatternForRule(pattern);
                        setRuleName(
                          `Auto-remediation: ${pattern.type.replace(/_/g, " ")}`,
                        );
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 dark:text-purple-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Configure Automation
                    </button>

                    {pattern.status === "active" && (
                      <button
                        onClick={() => handleAcknowledge(pattern._id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        title="Acknowledge pattern"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Ack
                      </button>
                    )}

                    <button
                      onClick={() => handleDismiss(pattern._id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      title="Dismiss pattern"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* AI Recommendation Box */}
                <div className="p-5 bg-gray-50/70 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-1.5 flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-linear-to-r from-indigo-500 to-purple-500 flex items-center justify-center">
                      <Sparkles className="w-2.5 h-2.5 text-white" />
                    </span>
                    AI Remediation Strategy
                  </h4>
                  <p className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed">
                    {pattern.aiRecommendation ||
                      "Review scheduling allocations and action-item ownership to mitigate this trend."}
                  </p>
                </div>

                {/* Action History Log */}
                {pattern.actionHistory && pattern.actionHistory.length > 0 && (
                  <div className="p-4 bg-indigo-50/30 dark:bg-indigo-950/20 border-b border-gray-100 dark:border-gray-700">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 mb-2 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5" />
                      Remediation History
                    </h5>
                    <div className="space-y-1.5">
                      {pattern.actionHistory.map((act, aIdx) => (
                        <div
                          key={aIdx}
                          className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300"
                        >
                          <span className="flex items-center gap-1.5">
                            <ShieldCheck className="w-3 h-3 text-emerald-500" />
                            <span className="font-semibold capitalize">
                              {act.actionType.replace(/_/g, " ")}:
                            </span>{" "}
                            {act.details?.taskText ||
                              act.details?.ruleName ||
                              act.details?.message ||
                              "Action logged"}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(act.performedAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Affected Meetings */}
                {pattern.affectedMeetings &&
                  pattern.affectedMeetings.length > 0 && (
                    <div className="p-5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2.5">
                        Affected Meetings
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {pattern.affectedMeetings.map((m) => (
                          <Link
                            key={m._id}
                            to={`/meeting/${m._id}`}
                            className="text-xs font-medium px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                          >
                            {m.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Generate ActionItem Task */}
      {selectedPatternForTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 border border-gray-200 dark:border-gray-700 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
              Create Remediation Task
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Provision an actionable task in your organization backlog to
              address this pattern.
            </p>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Task Title / Description
                </label>
                <textarea
                  rows={3}
                  value={taskText}
                  onChange={(e) => setTaskText(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Priority
                </label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 outline-hidden"
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setSelectedPatternForTask(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTask}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingTask ? "Creating Task..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Configure Automation Rule */}
      {selectedPatternForRule && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 border border-gray-200 dark:border-gray-700 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
              Configure Automation Rule
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Set up automated guardrails whenever meetings finish or MoM is
              generated.
            </p>

            <form onSubmit={handleConfigureAutomation} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Rule Name
                </label>
                <input
                  type="text"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Trigger Event
                </label>
                <select
                  value={triggerEvent}
                  onChange={(e) => setTriggerEvent(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 outline-hidden"
                >
                  <option value="mom.generated">
                    When Minutes of Meeting (MoM) is Generated
                  </option>
                  <option value="meeting.created">
                    When Meeting is Created
                  </option>
                  <option value="actionItem.completed">
                    When Action Item is Completed
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Action Dispatch
                </label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 outline-hidden"
                >
                  <option value="email">Send Email Remediation Summary</option>
                  <option value="slack">
                    Dispatch Slack Webhook Notification
                  </option>
                  <option value="tag">Auto-Tag Affected Topic</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setSelectedPatternForRule(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isConfiguringRule}
                  className="px-4 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl disabled:opacity-50 cursor-pointer"
                >
                  {isConfiguringRule ? "Configuring..." : "Enable Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingPatterns;
