import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Clock,
  CheckCircle,
  Users,
  Target,
  FileText,
  RefreshCw,
  MoreVertical,
  Check,
  X,
} from "lucide-react";
import axios from "../../services/api";

const ICONS = {
  overtime_trend: <Clock className="w-5 h-5" />,
  declining_attendance: <Users className="w-5 h-5" />,
  agenda_bloat: <FileText className="w-5 h-5" />,
  stale_action_items: <Target className="w-5 h-5" />,
};

const COLORS = {
  info: "text-blue-600 bg-blue-50 border-blue-200",
  warning: "text-amber-600 bg-amber-50 border-amber-200",
  critical: "text-red-600 bg-red-50 border-red-200",
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
    } catch (err) {
      console.error(err);
      alert("Failed to run manual scan.");
    } finally {
      setScanning(false);
    }
  };

  const handleAcknowledge = async (id) => {
    try {
      await axios.patch(`/api/patterns/${id}/acknowledge`);
      setPatterns(
        patterns.map((p) =>
          p._id === id ? { ...p, status: "acknowledged" } : p,
        ),
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDismiss = async (id) => {
    try {
      await axios.patch(`/api/patterns/${id}/dismiss`);
      setPatterns(patterns.filter((p) => p._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const displayedPatterns = patterns.filter((p) => {
    if (activeTab === "active") return p.status === "active";
    if (activeTab === "acknowledged") return p.status === "acknowledged";
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-amber-500" />
            Meeting Patterns
          </h1>
          <p className="text-gray-500 mt-1">
            AI-powered insights identifying recurring behaviors across your
            organization's meetings.
          </p>
        </div>
        <button
          onClick={handleManualScan}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />
          {scanning ? "Scanning..." : "Run Manual Scan"}
        </button>
      </div>

      <div className="flex gap-4 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("active")}
          className={`pb-2 px-1 ${activeTab === "active" ? "border-b-2 border-indigo-600 text-indigo-600 font-medium" : "text-gray-500"}`}
        >
          Active Patterns
        </button>
        <button
          onClick={() => setActiveTab("acknowledged")}
          className={`pb-2 px-1 ${activeTab === "acknowledged" ? "border-b-2 border-indigo-600 text-indigo-600 font-medium" : "text-gray-500"}`}
        >
          Acknowledged
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">
          Loading patterns...
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
      ) : displayedPatterns.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">All clear!</h3>
          <p className="text-gray-500">
            No organizational anti-patterns detected.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {displayedPatterns.map((pattern) => (
            <div
              key={pattern._id}
              className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
            >
              <div className="p-5 border-b border-gray-100 flex justify-between items-start">
                <div className="flex gap-4">
                  <div
                    className={`p-3 rounded-lg border ${COLORS[pattern.severity]}`}
                  >
                    {ICONS[pattern.type] || (
                      <AlertTriangle className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {TITLES[pattern.type] || pattern.type}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Detected across {pattern.affectedMeetings?.length || 0}{" "}
                      recent meetings
                    </p>
                  </div>
                </div>

                {pattern.status === "active" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcknowledge(pattern._id)}
                      className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                      title="Acknowledge"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDismiss(pattern._id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Dismiss"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="p-5 bg-gray-50">
                <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">AI</span>
                  </span>
                  AI Recommendation
                </h4>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {pattern.aiRecommendation ||
                    "Consider reviewing your meeting practices to address this pattern."}
                </p>
              </div>

              {pattern.affectedMeetings &&
                pattern.affectedMeetings.length > 0 && (
                  <div className="p-5">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      Affected Meetings
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {pattern.affectedMeetings.map((m) => (
                        <Link
                          key={m._id}
                          to={`/meetings/${m._id}`}
                          className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
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
  );
};

export default MeetingPatterns;
