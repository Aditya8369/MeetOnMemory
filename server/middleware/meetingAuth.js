import Meeting from "../models/meetingModel.js";

/**
 * @desc Middleware to verify the authenticated user has access to the specified meeting.
 * Prevents cross-organization data leakage.
 */
export const verifyMeetingAccess = async (req, res, next) => {
  try {
    const meetingId = req.params.meetingId || req.body.meetingId;
    if (!meetingId)
      return res
        .status(400)
        .json({ success: false, error: "Meeting ID required" });

    const meeting = await Meeting.findById(meetingId);
    if (!meeting)
      return res
        .status(404)
        .json({ success: false, error: "Meeting not found" });

    // Verify organization/tenant match
    if (
      meeting.organizationId?.toString() !== req.user.organizationId?.toString()
    ) {
      return res
        .status(403)
        .json({ success: false, error: "Unauthorized access to meeting" });
    }

    req.meeting = meeting;
    next();
  } catch (_err) {
    res
      .status(500)
      .json({ success: false, error: "Server error during authorization" });
  }
};

/**
 * @desc Middleware to verify the authenticated user has access to a specific action item.
 */
export const verifyActionItemAccess = async (req, res, next) => {
  try {
    const ActionItem = (await import("../models/ActionItem.js")).default;
    const item = await ActionItem.findById(req.params.id).populate("meetingId");

    if (!item)
      return res
        .status(404)
        .json({ success: false, error: "Action item not found" });

    if (
      item.meetingId.organizationId?.toString() !==
      req.user.organizationId?.toString()
    ) {
      return res
        .status(403)
        .json({ success: false, error: "Unauthorized access to action item" });
    }

    req.actionItem = item;
    next();
  } catch (_err) {
    res
      .status(500)
      .json({ success: false, error: "Server error during authorization" });
  }
};
