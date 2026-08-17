import ParticipantEngagementService from "../services/participantEngagementService.js";
import ParticipantEngagement from "../models/participantEngagementModel.js";

/**
 * Get an individual participant's engagement scorecard
 */
export const getParticipantScorecard = async (req, res) => {
  try {
    const { userId } = req.params;
    const orgId = req.user.organization; // Assuming userAuth middleware sets req.user

    let scorecard = await ParticipantEngagement.findOne({
      userId,
      organizationId: orgId,
    }).populate("userId", "name email profilePic");

    if (!scorecard) {
      // Create it if it doesn't exist
      scorecard = await ParticipantEngagementService.updateScorecard(
        userId,
        orgId,
      );
      // populate again
      scorecard = await ParticipantEngagement.findById(scorecard._id).populate(
        "userId",
        "name email profilePic",
      );
    }

    res.status(200).json({ success: true, data: scorecard });
  } catch (error) {
    console.error("Error fetching participant scorecard:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * Get organization-wide rankings
 */
export const getOrganizationRankings = async (req, res) => {
  try {
    const orgId = req.user.organization;
    const {
      page = 1,
      limit = 20,
      sortBy = "overallScore",
      order = -1,
    } = req.query;

    const result = await ParticipantEngagementService.getOrganizationRankings(
      orgId,
      {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sortBy,
        order: parseInt(order, 10),
      },
    );

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching organization rankings:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * Force recalculate a scorecard
 */
export const recalculateScorecard = async (req, res) => {
  try {
    const { userId } = req.params;
    const orgId = req.user.organization;

    const scorecard = await ParticipantEngagementService.updateScorecard(
      userId,
      orgId,
    );

    res.status(200).json({
      success: true,
      data: scorecard,
      message: "Scorecard updated successfully",
    });
  } catch (error) {
    console.error("Error recalculating scorecard:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
