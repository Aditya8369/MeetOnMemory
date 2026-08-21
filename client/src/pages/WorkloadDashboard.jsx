import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import api from "../services/apiClient";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Activity, Zap, CheckCircle, ArrowRight } from "lucide-react";

const WorkloadDashboard = () => {
  const [workloads, setWorkloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState([]);
  const [suggesting, setSuggesting] = useState(false);
  const [rebalancing, setRebalancing] = useState(false);

  useEffect(() => {
    fetchWorkload();
  }, []);

  const fetchWorkload = async () => {
    try {
      const response = await api.get("/workload");
      setWorkloads(response.data.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load workload data");
    } finally {
      setLoading(false);
    }
  };

  const handleSuggest = async () => {
    setSuggesting(true);
    try {
      const response = await api.get("/workload/suggest");
      setSuggestions(response.data.data.suggestions || []);
      toast.success(response.data.data.message);
    } catch (error) {
      console.error(error);
      toast.error("Failed to get suggestions");
    } finally {
      setSuggesting(false);
    }
  };

  const handleAcceptSuggestion = async (suggestion) => {
    setRebalancing(true);
    try {
      await api.post("/workload/rebalance", {
        reassignments: [
          {
            actionItemId: suggestion.actionItemId,
            toUserId: suggestion.toUserId,
          },
        ],
      });
      toast.success("Reassigned successfully");
      setSuggestions(
        suggestions.filter((s) => s.actionItemId !== suggestion.actionItemId),
      );
      fetchWorkload(); // refresh data
    } catch (error) {
      console.error(error);
      toast.error("Failed to reassign");
    } finally {
      setRebalancing(false);
    }
  };

  const chartData = workloads
    .map((w) => ({
      name: w.user.name,
      loadScore: w.loadScore,
      items: w.actionItems.length,
    }))
    .sort((a, b) => b.loadScore - a.loadScore);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-8 h-8 text-blue-500" />
            Workload Balance
          </h1>
          <p className="text-gray-500 mt-1">
            Cross-meeting task distribution across the team.
          </p>
        </div>
        <button
          onClick={handleSuggest}
          disabled={suggesting}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none disabled:shadow-md"
        >
          <Zap className="w-5 h-5" />
          {suggesting ? "Analyzing..." : "AI Rebalance"}
        </button>
      </header>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md">
            <h2 className="text-xl font-semibold mb-6 text-gray-800 dark:text-gray-100">
              Load Distribution
            </h2>
            <div className="h-80 w-full">
              <ResponsiveContainer>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ left: 50, right: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#374151"
                    opacity={0.2}
                  />
                  <XAxis type="number" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "#6B7280" }}
                    width={100}
                  />
                  <Tooltip
                    cursor={{ fill: "transparent" }}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="loadScore"
                    name="Load Score"
                    fill="#3B82F6"
                    radius={[0, 4, 4, 0]}
                    barSize={24}
                  />
                  <Bar
                    dataKey="items"
                    name="Task Count"
                    fill="#8B5CF6"
                    radius={[0, 4, 4, 0]}
                    barSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-y-auto max-h-[500px] transition-all hover:shadow-md">
            <h2 className="text-xl font-semibold mb-6 text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              AI Suggestions
            </h2>
            {suggestions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No active suggestions. Click "AI Rebalance" to generate
                load-balancing recommendations.
              </p>
            ) : (
              <div className="space-y-4">
                {suggestions.map((s, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-100 dark:border-gray-600 transition-all hover:shadow-md group"
                  >
                    <p className="text-sm text-gray-900 dark:text-gray-100 font-medium mb-2 line-clamp-2">
                      "{s.item.text}"
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
                      <span className="flex items-center gap-1">
                        <img
                          src={
                            s.fromUser.avatarUrl ||
                            `https://ui-avatars.com/api/?name=${s.fromUser.name}`
                          }
                          alt=""
                          className="w-5 h-5 rounded-full"
                        />
                        {s.fromUser.name}
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                        <img
                          src={
                            s.toUser.avatarUrl ||
                            `https://ui-avatars.com/api/?name=${s.toUser.name}`
                          }
                          alt=""
                          className="w-5 h-5 rounded-full"
                        />
                        {s.toUser.name}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 italic mb-3">
                      {s.reason}
                    </p>
                    <button
                      onClick={() => handleAcceptSuggestion(s)}
                      disabled={rebalancing}
                      className="w-full flex justify-center items-center gap-2 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 rounded-lg text-sm font-medium transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Accept
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkloadDashboard;
