import effectivenessScoreService from "../services/effectivenessScoreService.js";

/**
 * Calculate and retrieve effectiveness score for a meeting
 */
export const calculateMeetingScore = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { organizationId, seriesId } = req.body; // or req.user.organization if context is available

    if (!organizationId) {
      return res
        .status(400)
        .json({ success: false, message: "Organization ID is required" });
    }

    const score = await effectivenessScoreService.calculateMeetingScore(
      meetingId,
      organizationId,
      seriesId,
    );
    res.status(200).json({ success: true, data: score });
  } catch (error) {
    console.error("Error in calculateMeetingScore:", error);
    res.status(500).json({
      success: false,
      message: "Failed to calculate effectiveness score",
    });
  }
};

/**
 * Get effectiveness score for a meeting
 */
export const getMeetingScore = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const score = await effectivenessScoreService.getMeetingScore(meetingId);

    if (!score) {
      return res
        .status(404)
        .json({ success: false, message: "Score not found for this meeting" });
    }

    res.status(200).json({ success: true, data: score });
  } catch (error) {
    console.error("Error in getMeetingScore:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch effectiveness score" });
  }
};

/**
 * Get organization-level trend
 */
export const getOrganizationTrends = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { days } = req.query;

    const trends = await effectivenessScoreService.getOrganizationTrends(
      organizationId,
      parseInt(days) || 30,
    );

    res.status(200).json({ success: true, data: trends });
  } catch (error) {
    console.error("Error in getOrganizationTrends:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch organization trends" });
  }
};

/**
 * Get series-level trend
 */
export const getSeriesTrends = async (req, res) => {
  try {
    const { seriesId } = req.params;
    const { limit } = req.query;

    const trends = await effectivenessScoreService.getSeriesTrends(
      seriesId,
      parseInt(limit) || 10,
    );

    res.status(200).json({ success: true, data: trends });
  } catch (error) {
    console.error("Error in getSeriesTrends:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch series trends" });
  }
};
