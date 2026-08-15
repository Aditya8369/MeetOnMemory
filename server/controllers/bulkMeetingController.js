import BulkMeetingService from "../services/bulkMeetingService.js";

/**
 * Archive multiple meetings
 */
export const bulkArchive = async (req, res, next) => {
  try {
    const { meetingIds } = req.body;
    const userOrgId = req.user.organization;

    const modifiedCount = await BulkMeetingService.bulkArchive(
      meetingIds,
      userOrgId,
    );

    res.status(200).json({
      success: true,
      message: `Successfully archived ${modifiedCount} meeting(s).`,
      modifiedCount,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Tag multiple meetings
 */
export const bulkTag = async (req, res, next) => {
  try {
    const { meetingIds, tags } = req.body;
    const userOrgId = req.user.organization;

    const modifiedCount = await BulkMeetingService.bulkTag(
      meetingIds,
      tags,
      userOrgId,
    );

    res.status(200).json({
      success: true,
      message: `Successfully tagged ${modifiedCount} meeting(s).`,
      modifiedCount,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Soft delete multiple meetings
 */
export const bulkSoftDelete = async (req, res, next) => {
  try {
    const { meetingIds } = req.body;
    const userOrgId = req.user.organization;
    const userId = req.user._id;

    const modifiedCount = await BulkMeetingService.bulkSoftDelete(
      meetingIds,
      userOrgId,
      userId,
    );

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${modifiedCount} meeting(s).`,
      modifiedCount,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Restore multiple meetings (from archive or soft-delete)
 */
export const bulkRestore = async (req, res, next) => {
  try {
    const { meetingIds } = req.body;
    const userOrgId = req.user.organization;

    const modifiedCount = await BulkMeetingService.bulkRestore(
      meetingIds,
      userOrgId,
    );

    res.status(200).json({
      success: true,
      message: `Successfully restored ${modifiedCount} meeting(s).`,
      modifiedCount,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Export multiple meetings as a ZIP
 */
export const bulkExport = async (req, res, next) => {
  try {
    const { meetingIds, format = "md" } = req.body;
    const userOrgId = req.user.organization;

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=meetings_export_${Date.now()}.zip`,
    );

    await BulkMeetingService.bulkExport(meetingIds, userOrgId, format, res);
  } catch (err) {
    // If headers are already sent, we can't send a JSON response
    if (res.headersSent) {
      console.error("Error during ZIP stream:", err);
      res.end();
    } else {
      next(err);
    }
  }
};
