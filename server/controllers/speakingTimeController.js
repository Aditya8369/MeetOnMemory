import {
  getBreakdownForMeeting,
  getTrendsForUser,
} from "../services/speakingTimeService.js";
import Meeting from "../models/meetingModel.js";

/**
 * Controller to get speaking time breakdown for a specific meeting
 */
export const getSpeakingTimeBreakdown = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user._id;

    // Verify meeting exists and user has access
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res
        .status(404)
        .json({ success: false, message: "Meeting not found" });
    }

    // Check access: user is owner or participant (simplified access check for this endpoint)
    const isOwner = meeting.owner.toString() === userId.toString();
    const isParticipant = meeting.participants.some(
      (p) => p.toString() === userId.toString(),
    );

    // If needed, check org level access. For now, require direct association.
    if (!isOwner && !isParticipant) {
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
    const limit = parseInt(req.query.limit, 10) || 10;

    const trends = await getTrendsForUser(userId, limit);
    return res.status(200).json({ success: true, data: trends });
  } catch (error) {
    console.error("Error in getSpeakingTimeTrends:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
