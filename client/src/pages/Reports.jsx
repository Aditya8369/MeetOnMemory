import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Navbar from "../components/Navbar.jsx";
import { toast } from "react-toastify";
import { analyticsApi } from "../services";
import { Bar, Line, Pie } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";
import { Loader2, Brain, BarChart4, PieChart, Sparkles, RefreshCw } from "lucide-react";

Chart.register(...registerables);

const Reports = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [aiInsights, setAiInsights] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await analyticsApi.getAnalytics();

        if (res?.data?.success) {
          setData(res.data);
        } else {
          toast.error(t("reports.failedToLoad"));
        }
      } catch (error) {
        console.error("Error loading analytics:", error);
        toast.error(t("reports.errorLoading"));
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [t]);

  // 🧠 Generate Gemini-based insights on demand
  const generateAIInsights = async () => {
    if (aiLoading || !data?.summary) return;

    setAiLoading(true);
    setAiError("");
    try {
      const aiRes = await analyticsApi.askAnalyticsChat({ summary: data.summary });
      if (aiRes.data?.success && aiRes.data?.insight) {
        setAiInsights(aiRes.data.insight);
      } else {
        const errorMsg = t("reports.aiInsightsUnavailable");
        setAiError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error("AI Insights error:", err);
      const errorMsg = t("reports.aiInsightsUnavailable");
      setAiError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setAiLoading(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex justify-center items-center">
        <Loader2 className="animate-spin w-8 h-8 text-gray-500 dark:text-gray-400" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">
          {t("reports.loading")}
        </span>
      </div>
    );

  if (!data)
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex justify-center items-center text-gray-600 dark:text-gray-400">
        {t("common.noResults")}
      </div>
    );

  const { summary, trends } = data;

  // Chart Data
  const meetingTrendData = {
    labels: trends.monthlyMeetings.map((t) => `Month ${t._id}`),
    datasets: [
      {
        label: t("navbar.meetings"),
        data: trends.monthlyMeetings.map((t) => t.count),
        borderColor: "#4F46E5",
        backgroundColor: "rgba(99, 102, 241, 0.5)",
      },
    ],
  };

  const policyTrendData = {
    labels: trends.monthlyPolicies.map((t) => `Month ${t._id}`),
    datasets: [
      {
        label: t("navbar.compliance"),
        data: trends.monthlyPolicies.map((t) => t.count),
        backgroundColor: "rgba(16, 185, 129, 0.7)",
      },
    ],
  };

  const pieData = {
    labels: [
      t("reports.completedMeetings", "Completed Meetings"),
      t("reports.pendingMeetings", "Pending Meetings"),
    ],
    datasets: [
      {
        data: [
          summary.completedMeetings,
          summary.totalMeetings - summary.completedMeetings,
        ],
        backgroundColor: ["#6366F1", "rgba(148, 163, 184, 0.3)"],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200">
      <Navbar />
      <div className="max-w-6xl mx-auto text-center pt-24 pb-20 px-6">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 flex justify-center items-center gap-2">
          <BarChart4 className="text-indigo-600 dark:text-indigo-400 w-8 h-8" />{" "}
          {t("reports.title")}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-10">
          {t("dashboard.reportsAnalyticsDesc")}
        </p>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
          <StatCard
            title={t("reports.totalMeetings", "Total Meetings")}
            value={summary.totalMeetings}
            color="indigo"
          />
          <StatCard
            title={t("reports.completedMeetings", "Completed Meetings")}
            value={summary.completedMeetings}
            color="green"
          />
          <StatCard
            title={t("reports.totalPolicies", "Total Policies")}
            value={summary.totalPolicies}
            color="blue"
          />
          <StatCard
            title={t("reports.updatedPolicies", "Updated Policies")}
            value={summary.updatedPolicies}
            color="purple"
          />
        </div>

        {/* Charts Section */}
        <div className="grid md:grid-cols-2 gap-8 mb-10">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md border dark:border-gray-800">
            <h2 className="text-lg font-semibold dark:text-white mb-3">
              📈 {t("reports.meetingTrends")}
            </h2>
            <Line data={meetingTrendData} />
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md border dark:border-gray-800">
            <h2 className="text-lg font-semibold dark:text-white mb-3">
              📊 {t("reports.policyActivity")}
            </h2>
            <Bar data={policyTrendData} />
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md border dark:border-gray-800 max-w-2xl mx-auto mb-10">
          <h2 className="text-lg font-semibold dark:text-white mb-3 flex items-center justify-center gap-2">
            <PieChart className="text-indigo-600 dark:text-indigo-400 w-5 h-5" />{" "}
            {t("reports.meetingDistribution")}
          </h2>
          <Pie data={pieData} />
        </div>

        {/* AI Insights Section */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md border dark:border-gray-800 text-left">
          {!aiInsights && !aiLoading && (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-purple-50/50 dark:bg-purple-950/20 rounded-lg border border-purple-100 dark:border-purple-900/30">
              <Brain className="w-10 h-10 text-purple-600 dark:text-purple-400 mb-3" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {t("reports.aiInsights", "AI Insights")}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-5 max-w-md">
                {t(
                  "reports.aiInsightsPlaceholder",
                  "Generate AI-powered analysis and recommendations based on your meeting and policy analytics.",
                )}
              </p>
              {aiError && (
                <p className="text-xs text-red-600 dark:text-red-400 mb-3 font-medium">
                  {aiError}
                </p>
              )}
              <button
                onClick={generateAIInsights}
                disabled={aiLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                {t("reports.generateAiInsights", "Generate AI Insights")}
              </button>
            </div>
          )}

          {aiLoading && (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-purple-50/50 dark:bg-purple-950/20 rounded-lg border border-purple-100 dark:border-purple-900/30">
              <Loader2 className="animate-spin w-8 h-8 text-purple-600 dark:text-purple-400 mb-3" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("reports.generatingAiInsights", "Generating AI Insights...")}
              </p>
            </div>
          )}

          {aiInsights && !aiLoading && (
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
                <h2 className="text-xl font-semibold dark:text-white flex items-center gap-2">
                  <Brain className="text-purple-600 dark:text-purple-400 w-6 h-6" />{" "}
                  {t("reports.aiInsights")}
                </h2>
                <button
                  onClick={generateAIInsights}
                  disabled={aiLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-md border border-purple-200 dark:border-purple-800 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {t("reports.regenerateAiInsights", "Regenerate")}
                </button>
              </div>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {aiInsights}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 🔹 Stats Card Component
const StatCard = ({ title, value, color }) => {
  const colorMap = {
    indigo:
      "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border dark:border-indigo-900/50",
    green:
      "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border dark:border-green-900/50",
    blue: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border dark:border-blue-900/50",
    purple:
      "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border dark:border-purple-900/50",
  };
  return (
    <div
      className={`p-5 rounded-xl shadow-sm ${colorMap[color]} font-semibold`}
    >
      <h3 className="text-sm">{title}</h3>
      <p className="text-2xl mt-2">{value}</p>
    </div>
  );
};

export default Reports;
