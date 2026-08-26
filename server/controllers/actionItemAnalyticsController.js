import actionItemAnalyticsService from "../services/actionItemAnalyticsService.js";

/**
 * Controller for Action Item Analytics
 */
export const getCompletionMetrics = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "startDate and endDate are required" });
    }

    const metrics = await actionItemAnalyticsService.getCompletionMetrics(
      organizationId,
      startDate,
      endDate,
    );

    res.json(metrics);
  } catch (error) {
    console.error("Error in getCompletionMetrics:", error);
    res
      .status(500)
      .json({ message: "Server error retrieving completion metrics" });
  }
};

export const getAssigneeLeaderboards = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "startDate and endDate are required" });
    }

    const leaderboard =
      await actionItemAnalyticsService.getAssigneeLeaderboards(
        organizationId,
        startDate,
        endDate,
      );

    res.json(leaderboard);
  } catch (error) {
    console.error("Error in getAssigneeLeaderboards:", error);
    res
      .status(500)
      .json({ message: "Server error retrieving assignee leaderboards" });
  }
};

export const getPriorityBreakdowns = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "startDate and endDate are required" });
    }

    const breakdowns = await actionItemAnalyticsService.getPriorityBreakdowns(
      organizationId,
      startDate,
      endDate,
    );

    res.json(breakdowns);
  } catch (error) {
    console.error("Error in getPriorityBreakdowns:", error);
    res
      .status(500)
      .json({ message: "Server error retrieving priority breakdowns" });
  }
};

export const getOverdueTrends = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "startDate and endDate are required" });
    }

    const trends = await actionItemAnalyticsService.getOverdueTrends(
      organizationId,
      startDate,
      endDate,
    );

    res.json(trends);
  } catch (error) {
    console.error("Error in getOverdueTrends:", error);
    res.status(500).json({ message: "Server error retrieving overdue trends" });
  }
};

export const getMeetingEffectiveness = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "startDate and endDate are required" });
    }

    const effectiveness =
      await actionItemAnalyticsService.getMeetingEffectiveness(
        organizationId,
        startDate,
        endDate,
      );

    res.json(effectiveness);
  } catch (error) {
    console.error("Error in getMeetingEffectiveness:", error);
    res
      .status(500)
      .json({ message: "Server error retrieving meeting effectiveness" });
  }
};
