import * as minutesApprovalService from "../services/minutesApprovalService.js";

/**
 * @desc Get the minutes approval status for a meeting
 * @route GET /api/meetings/:meetingId/minutes-approval
 * @access Private
 */
export const getApprovalStatus = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const approval = await minutesApprovalService.getApprovalStatus(meetingId);

    res.status(200).json({
      success: true,
      approval,
    });
  } catch (error) {
    console.error("Error fetching minutes approval:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Submit meeting minutes for approval
 * @route POST /api/meetings/:meetingId/minutes-approval/submit
 * @access Private
 */
export const submitApproval = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { summary, approverIds } = req.body;
    const submitterId = req.user.dbUserId; // Assuming authenticated user

    if (
      !summary ||
      !approverIds ||
      !Array.isArray(approverIds) ||
      approverIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Summary and approverIds are required.",
      });
    }

    const approval = await minutesApprovalService.submitForApproval(
      meetingId,
      submitterId,
      summary,
      approverIds,
    );

    res.status(200).json({
      success: true,
      approval,
      message: "Minutes submitted for approval.",
    });
  } catch (error) {
    console.error("Error submitting minutes approval:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Respond to a minutes approval request
 * @route PUT /api/meetings/:meetingId/minutes-approval/respond
 * @access Private
 */
export const respondApproval = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { status, comment } = req.body;
    const approverId = req.user.dbUserId;

    if (!["approved", "rejected"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status." });
    }

    const approval = await minutesApprovalService.respondToApproval(
      meetingId,
      approverId,
      status,
      comment,
    );

    res.status(200).json({
      success: true,
      approval,
      message: `Minutes ${status} successfully.`,
    });
  } catch (error) {
    console.error("Error responding to minutes approval:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
