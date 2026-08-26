import mongoose from "mongoose";
import {
  getBreakdownForMeeting,
  getTrendsForUser,
  getOrgSpeakingTimeStats,
} from "../services/speakingTimeService.js";
import Meeting from "../models/meetingModel.js";

/**
 * Controller to get speaking time breakdown for a specific meeting
 */
export const getSpeakingTimeBreakdown = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(meetingId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid meeting ID format" });
    }

    // Verify meeting exists and user has access
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res
        .status(404)
        .json({ success: false, message: "Meeting not found" });
    }

    // Check access: user is owner or participant (simplified access check for this endpoint)
    const isOwner = meeting.uploadedBy?.toString() === userId.toString();
    const isParticipant = meeting.participants.some(
      (p) => p.user?.toString() === userId.toString(),
    );
    const isOrgMember =
      meeting.organization &&
      req.user.organization &&
      meeting.organization.toString() === req.user.organization.toString();

    // If needed, check org level access. For now, require direct association or org membership.
    if (!isOwner && !isParticipant && !isOrgMember) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const breakdown = await getBreakdownForMeeting(meetingId);
    return res.status(200).json({ success: true, data: breakdown });
  } catch (error) {
    console.error("Error in getSpeakingTimeBreakdown:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

/**
 * Controller to get speaking time trends for the authenticated user
 */
export const getSpeakingTimeTrends = async (req, res) => {
  try {
    const userId = req.user._id;
    let limit = parseInt(req.query.limit, 10);
    if (isNaN(limit) || limit < 1) {
      limit = 10;
    } else if (limit > 50) {
      limit = 50;
    }

    const trends = await getTrendsForUser(userId, limit);
    return res.status(200).json({ success: true, data: trends });
  } catch (error) {
    console.error("Error in getSpeakingTimeTrends:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

/**
 * Controller to get speaking time comparison stats for all members in the user's organization
 */
export const getSpeakingTimeOrgCompare = async (req, res) => {
  try {
    const orgId = req.user.organization;
    if (!orgId) {
      return res
        .status(400)
        .json({ success: false, message: "Organization ID is required" });
    }

    const { startDate, endDate } = req.query;

    const stats = await getOrgSpeakingTimeStats(orgId, startDate, endDate);
    return res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error("Error in getSpeakingTimeOrgCompare:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
