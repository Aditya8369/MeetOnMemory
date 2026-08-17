import Meeting from "../models/meetingModel.js";

/**
 * @desc Middleware to verify the authenticated user has access to a specific meeting.
 */
export const verifyMeetingAccess = async (req, res, next) => {
  try {
    const { meetingId } = req.params;
    const meeting = await Meeting.findById(meetingId);

    if (!meeting) {
      return res
        .status(404)
        .json({ success: false, error: "Meeting not found" });
    }

    // Verify organization ownership match
    const meetingOrgId = meeting.organization || meeting.organizationId;
    const userOrgId = req.user.organization || req.user.organizationId;

    if (
      meetingOrgId &&
      userOrgId &&
      meetingOrgId.toString() !== userOrgId.toString()
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
    const ActionItem = (await import("../models/actionItemModel.js")).default;
    const item = await ActionItem.findById(req.params.id)
      .populate("sourceMeetingId")
      .populate("meetingId");

    if (!item)
      return res
        .status(404)
        .json({ success: false, error: "Action item not found" });

    const meeting = item.sourceMeetingId || item.meetingId;
    const meetingOrgId = meeting?.organization || meeting?.organizationId;
    const userOrgId = req.user.organization || req.user.organizationId;

    if (
      meetingOrgId &&
      userOrgId &&
      meetingOrgId.toString() !== userOrgId.toString()
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
