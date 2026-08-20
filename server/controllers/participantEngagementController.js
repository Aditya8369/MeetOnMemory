import mongoose from "mongoose";
import ParticipantEngagementService from "../services/participantEngagementService.js";
import ParticipantEngagement from "../models/participantEngagementModel.js";

/**
 * Get an individual participant's engagement scorecard
 */
export const getParticipantScorecard = async (req, res) => {
  try {
    const { userId } = req.params;
    const orgId = (
      req.user?.organization?._id || req.user?.organization
    )?.toString();

    if (!orgId || !mongoose.Types.ObjectId.isValid(orgId)) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required and must be valid",
      });
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID format" });
    }

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
    const orgId = (
      req.user?.organization?._id || req.user?.organization
    )?.toString();

    if (!orgId || !mongoose.Types.ObjectId.isValid(orgId)) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required and must be valid",
      });
    }

    const {
      page = 1,
      limit = 20,
      sortBy = "overallScore",
      order = -1,
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const parsedOrder =
      order === 1 || order === "1" || order === "asc" ? 1 : -1;

    const result = await ParticipantEngagementService.getOrganizationRankings(
      orgId,
      {
        page: parsedPage,
        limit: parsedLimit,
        sortBy: typeof sortBy === "string" ? sortBy : "overallScore",
        order: parsedOrder,
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
    const orgId = (
      req.user?.organization?._id || req.user?.organization
    )?.toString();

    if (!orgId || !mongoose.Types.ObjectId.isValid(orgId)) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required and must be valid",
      });
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID format" });
    }

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
