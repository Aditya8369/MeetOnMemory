import {
  initializeRsvps,
  updateRsvpStatus,
  getPendingRsvpsForUser,
  getMeetingRsvpSummary,
} from "../services/meetingRsvpService.js";
import Meeting from "../models/meetingModel.js";

/**
 * Send RSVP requests to participants
 */
export const sendRsvpRequests = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { userIds } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "user_ids_required",
      });
    }

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res
        .status(404)
        .json({ success: false, message: "meeting_not_found" });
    }

    // Only organizer can send RSVPs (assuming uploadedBy is the organizer)
    if (meeting.uploadedBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "only_organizer_can_send_rsvps",
      });
    }

    const rsvps = await initializeRsvps(meetingId, userIds);

    res.status(200).json({
      success: true,
      data: rsvps,
    });
  } catch (error) {
    console.error("Error sending RSVP requests:", error);
    res.status(500).json({ success: false, message: "server_error" });
  }
};

/**
 * Respond to an RSVP request
 */
export const respondToRsvp = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;
    const { status, declineReason, availabilityNote } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "status_required",
      });
    }

    const updatedRsvp = await updateRsvpStatus(meetingId, userId, {
      status,
      declineReason,
      availabilityNote,
    });

    res.status(200).json({
      success: true,
      data: updatedRsvp,
    });
  } catch (error) {
    console.error("Error responding to RSVP:", error);
    res
      .status(500)
      .json({ success: false, message: error.message || "server_error" });
  }
};

/**
 * Get pending RSVPs for the logged-in user
 */
export const getPendingRsvps = async (req, res) => {
  try {
    const userId = req.user.id;
    const rsvps = await getPendingRsvpsForUser(userId);

    res.status(200).json({
      success: true,
      data: rsvps,
    });
  } catch (error) {
    console.error("Error getting pending RSVPs:", error);
    res.status(500).json({ success: false, message: "server_error" });
  }
};

/**
 * Get the RSVP summary for a specific meeting
 */
export const getMeetingSummary = async (req, res) => {
  try {
    const { meetingId } = req.params;

    // 1. Verify meeting exists before fetching RSVP data
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ success: false, message: "meeting_not_found" });
    }

    // 2. Perform Organization Authorization Check
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const isSameOrganization = req.user.organization && meeting.organization && 
                               req.user.organization.toString() === meeting.organization.toString();

    if (!isAdmin && !isSameOrganization) {
      // Fail closed: Return 404 to avoid exposing that a foreign meeting ID is valid
      return res.status(404).json({ success: false, message: "meeting_not_found" });
    }

    // 3. Retrieve summary now that access is strictly authorized
    const summary = await getMeetingRsvpSummary(meetingId);

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Error getting RSVP summary:", error);
    res.status(500).json({ success: false, message: "server_error" });
  }
};
