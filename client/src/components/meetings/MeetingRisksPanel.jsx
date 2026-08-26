import React, { useState, useEffect } from "react";
import meetingRiskApi from "../../services/meetingRiskApi";
import { toast } from "react-toastify";
import { ShieldAlert, Plus, Edit2, Trash2, X, Check } from "lucide-react";

const MeetingRisksPanel = ({ meetingId }) => {
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const [newRisk, setNewRisk] = useState({
    title: "",
    description: "",
    category: "Technical",
    probability: 3,
    impact: 3,
    mitigationPlan: "",
  });

  useEffect(() => {
    fetchRisks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  const fetchRisks = async () => {
    try {
      setLoading(true);
      const data = await meetingRiskApi.getRisksByMeeting(meetingId);
      if (data.success) {
        setRisks(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch risks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRisk = async (e) => {
    e.preventDefault();
    if (!newRisk.title) {
      toast.error("Risk title is required");
      return;
    }
    try {
      const data = await meetingRiskApi.createRisk({ ...newRisk, meetingId });
      if (data.success) {
        toast.success("Risk added successfully");
        setRisks([data.data, ...risks]);
        setIsAdding(false);
        setNewRisk({
          title: "",
          description: "",
          category: "Technical",
          probability: 3,
          impact: 3,
          mitigationPlan: "",
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to add risk");
    }
  };

  const getRiskColor = (score) => {
    if (score >= 15)
      return "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/50";
    if (score >= 10)
      return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/50";
    if (score >= 5)
      return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50";
    return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50";
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-indigo-500" />
          Meeting Risks
        </h2>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-lg text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Risk
          </button>
        )}
      </div>

      {isAdding && (
        <form
          onSubmit={handleAddRisk}
          className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title
            </label>
            <input
              type="text"
              value={newRisk.title}
              onChange={(e) =>
                setNewRisk({ ...newRisk, title: e.target.value })
              }
              className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Integration delay"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={newRisk.category}
                onChange={(e) =>
                  setNewRisk({ ...newRisk, category: e.target.value })
                }
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option>Technical</option>
                <option>Schedule</option>
                <option>Financial</option>
                <option>Resource</option>
                <option>Operational</option>
                <option>Compliance</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Probability (1-5)
              </label>
              <input
                type="number"
                min="1"
                max="5"
                value={newRisk.probability}
                onChange={(e) =>
                  setNewRisk({
                    ...newRisk,
                    probability: parseInt(e.target.value),
                  })
                }
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Impact (1-5)
              </label>
              <input
                type="number"
                min="1"
                max="5"
                value={newRisk.impact}
                onChange={(e) =>
                  setNewRisk({ ...newRisk, impact: parseInt(e.target.value) })
                }
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Save Risk
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="text-sm text-gray-500 py-4 text-center">
            Loading risks...
          </div>
        ) : risks.length === 0 && !isAdding ? (
          <div className="text-sm text-gray-500 py-8 text-center flex flex-col items-center">
            <ShieldAlert className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
            No risks recorded for this meeting.
          </div>
        ) : (
          risks.map((risk) => (
            <div
              key={risk._id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30 gap-4 group"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                    {risk.title}
                  </h4>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${getRiskColor(risk.riskScore)}`}
                  >
                    Score: {risk.riskScore}
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-3">
                  <span>{risk.category}</span>
                  <span>•</span>
                  <span>Probability: {risk.probability}</span>
                  <span>•</span>
                  <span>Impact: {risk.impact}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium border ${risk.status === "Open" ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50" : "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"}`}
                >
                  {risk.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MeetingRisksPanel;
