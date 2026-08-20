import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import AppContent from "../context/AppContent";
import Navbar from "../components/Navbar.jsx";
import { toast } from "react-toastify";
import {
  getLatestInsight,
  triggerManualGeneration,
} from "../services/weeklyInsightApi.js";
import {
  Loader2,
  Zap,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Briefcase,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

const WeeklyInsights = () => {
  const { t } = useTranslation();
  const { activeOrganization } = useContext(AppContent);

  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const fetchInsight = async () => {
      setLoading(true);
      try {
        const data = await getLatestInsight(activeOrganization._id);
        setInsight(data);
      } catch (error) {
        console.error("Failed to fetch latest insight:", error);
        toast.error(t("weeklyInsights.fetchError", "Failed to load insights."));
      } finally {
        setLoading(false);
      }
    };

    if (activeOrganization) {
      fetchInsight();
    }
  }, [activeOrganization, t]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const data = await triggerManualGeneration(activeOrganization._id);
      setInsight(data);
      toast.success(
        t("weeklyInsights.generated", "Weekly insight generated successfully."),
      );
    } catch (error) {
      console.error("Failed to generate insight:", error);
      toast.error(
        t("weeklyInsights.generateError", "Failed to generate insight."),
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Weekly Insights Digest
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              AI-powered analysis of your organization's meetings over the past
              7 days.
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {generating ? (
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Zap className="w-5 h-5 mr-2" />
            )}
            Generate Now
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin w-8 h-8 text-indigo-500" />
          </div>
        ) : !insight ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-800">
            <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              No Insights Yet
            </h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Generate an insight to see cross-meeting patterns and stalled
              action items.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* AI Summary */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-indigo-500" />
                Strategic Summary
              </h2>
              <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {insight.aiSummary}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recurring Topics */}
              <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
                  Recurring Topics
                </h3>
                {insight.recurringTopics?.length > 0 ? (
                  <ul className="space-y-4">
                    {insight.recurringTopics.map((topic, i) => (
                      <li key={i} className="border-l-2 border-blue-500 pl-4">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {topic.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {topic.description}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No significant recurring topics detected.
                  </p>
                )}
              </div>

              {/* Stalled Action Items */}
              <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" />
                  Stalled Action Items
                </h3>
                {insight.stalledActionItems?.length > 0 ? (
                  <ul className="space-y-3">
                    {insight.stalledActionItems.map((item, i) => (
                      <li
                        key={i}
                        className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3"
                      >
                        <p className="text-sm text-gray-800 dark:text-gray-200">
                          {item.text}
                        </p>
                        {item.meetingId && (
                          <Link
                            to={`/meeting/${item.meetingId._id || item.meetingId}`}
                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-2 inline-block"
                          >
                            View Source Meeting
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No stalled action items detected.
                  </p>
                )}
              </div>

              {/* Decision Conflicts */}
              <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
                  Decision Conflicts
                </h3>
                {insight.decisionConflicts?.length > 0 ? (
                  <ul className="space-y-3">
                    {insight.decisionConflicts.map((conflict, i) => (
                      <li
                        key={i}
                        className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3"
                      >
                        <p className="text-sm text-gray-800 dark:text-gray-200">
                          {conflict.description}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No apparent decision conflicts detected.
                  </p>
                )}
              </div>
            </div>

            {/* Participation Trends */}
            {insight.participationTrends && (
              <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Participation Trends
                </h3>
                <p className="text-gray-700 dark:text-gray-300 text-sm">
                  {insight.participationTrends}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WeeklyInsights;
