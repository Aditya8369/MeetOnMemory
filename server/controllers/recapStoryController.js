// server/controllers/recapStoryController.js
/**
 * Recap Story Controller
 *
 * Provides endpoints to retrieve recap stories for meetings with strict meeting and organization access controls (IDOR defense).
 */

import Meeting from "../models/meetingModel.js";

/**
 * Helper function to validate authorization for accessing a meeting.
 * Ensures that the meeting exists and belongs to the authenticated user's organization,
 * or that the user is the direct uploader/owner of the meeting.
 *
 * @param {Object} meeting
 * @param {Object} user
 * @returns {boolean}
 */
export const checkMeetingOrgAccess = (meeting, user) => {
  if (!meeting || !user) return false;

  const userId = user._id?.toString() || user.id?.toString();
  const userOrgId =
    user.organization?.toString() || user.organizationId?.toString();
  const meetingOrgId = meeting.organization?.toString();
  const uploaderId = meeting.uploadedBy?.toString();

  // Access granted if user is the direct uploader
  if (uploaderId && userId && uploaderId === userId) {
    return true;
  }

  // Access granted if user belongs to the host organization of the meeting
  if (meetingOrgId && userOrgId && meetingOrgId === userOrgId) {
    return true;
  }

  return false;
};

/**
 * GET /api/recap-story/:meetingId
 * Retrieves the recap story and MoM summary for a given meeting.
 * Enforces meeting existence and organization membership verification to prevent IDOR attacks.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const getRecapStory = async (req, res, next) => {
  try {
    const meetingId = req.params.meetingId || req.query.meetingId;

    if (
      !meetingId ||
      typeof meetingId !== "string" ||
      !/^[0-9a-fA-F]{24}$/.test(meetingId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid meetingId format.",
      });
    }

    // Retrieve target meeting
    const meeting = await Meeting.findById(meetingId).lean();

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found.",
      });
    }

    // Access Control Validation: Ensure authenticated user belongs to host organization or uploaded the meeting
    const hasAccess = checkMeetingOrgAccess(meeting, req.user);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied: You do not have permission to view this meeting's recap story.",
      });
    }

    // Format recap story response
    const recapStory = {
      meetingId: meeting._id.toString(),
      title: meeting.title || "Untitled Meeting",
      summary: meeting.summary || "",
      structuredMoM: meeting.structuredMoM || null,
      recapHtml: `<div class="recap-story"><h1>${meeting.title || "Meeting Recap"}</h1><p>${meeting.summary || "No summary available."}</p></div>`,
      date: meeting.date,
      organization: meeting.organization,
    };

    return res.status(200).json({
      success: true,
      recapStory,
    });
  } catch (err) {
    return next(err);
  }
};
