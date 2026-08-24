import { useState, useEffect, useCallback } from "react";
import { actionItemAnalyticsApi } from "../services/actionItemAnalyticsApi";
import { toast } from "react-toastify";

export const useActionItemAnalytics = (startDate, endDate) => {
  const [metrics, setMetrics] = useState(null);
  const [leaderboards, setLeaderboards] = useState([]);
  const [priorityBreakdowns, setPriorityBreakdowns] = useState([]);
  const [overdueTrends, setOverdueTrends] = useState([]);
  const [meetingEffectiveness, setMeetingEffectiveness] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    if (!startDate || !endDate) return;

    setIsLoading(true);
    setError(null);

    try {
      const [
        metricsData,
        leaderboardsData,
        priorityData,
        trendsData,
        effectivenessData,
      ] = await Promise.all([
        actionItemAnalyticsApi.getCompletionMetrics(startDate, endDate),
        actionItemAnalyticsApi.getAssigneeLeaderboards(startDate, endDate),
        actionItemAnalyticsApi.getPriorityBreakdowns(startDate, endDate),
        actionItemAnalyticsApi.getOverdueTrends(startDate, endDate),
        actionItemAnalyticsApi.getMeetingEffectiveness(startDate, endDate),
      ]);

      setMetrics(metricsData);
      setLeaderboards(leaderboardsData);
      setPriorityBreakdowns(priorityData);
      setOverdueTrends(trendsData);
      setMeetingEffectiveness(effectivenessData);
    } catch (err) {
      console.error("Failed to fetch action item analytics:", err);
      setError("Failed to load analytics data");
      toast.error("Failed to load action item analytics");
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    metrics,
    leaderboards,
    priorityBreakdowns,
    overdueTrends,
    meetingEffectiveness,
    isLoading,
    error,
    refetch: fetchAnalytics,
  };
};
