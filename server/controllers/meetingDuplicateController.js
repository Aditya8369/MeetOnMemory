import * as duplicateService from "../services/meetingDuplicateService.js";
import Meeting from "../models/meetingModel.js";
import MergeAudit from "../models/mergeAuditModel.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";
import logger from "../utils/logger.js";

export const detectDuplicates = async (req, res) => {
  try {
    const { id } = req.params;
    const userOrgId = req.user?.organization?.toString();

    const meeting = await Meeting.findById(id).select("organization").lean();
    if (!meeting) return sendError(res, 404, "Meeting not found");
    if (meeting.organization?.toString() !== userOrgId) {
      return sendError(res, 403, "Access denied");
    }

    const duplicates = await duplicateService.findDuplicates(id);
    return sendSuccess(res, { duplicates }, "Duplicates fetched successfully");
  } catch (error) {
    logger.error("Error detecting duplicates:", error);
    return sendError(res, 500, error.message);
  }
};

export const mergeMeetings = async (req, res) => {
  try {
    const { id: primaryId } = req.params;
    const { secondaryId } = req.body;

    if (!secondaryId) {
      return sendError(res, 400, "Secondary meeting ID is required");
    }

    const userOrgId = req.user?.organization?.toString();
    const userId = req.user._id;

    const [primary, secondary] = await Promise.all([
      Meeting.findById(primaryId).select("organization").lean(),
      Meeting.findById(secondaryId).select("organization").lean(),
    ]);

    if (!primary || !secondary) {
      return sendError(res, 404, "One or both meetings not found");
    }
    if (
      primary.organization?.toString() !== userOrgId ||
      secondary.organization?.toString() !== userOrgId
    ) {
      return sendError(res, 403, "Access denied");
    }

    const result = await duplicateService.mergeMeetings(
      primaryId,
      secondaryId,
      userId,
    );
    return sendSuccess(res, result, "Meetings merged successfully");
  } catch (error) {
    logger.error("Error merging meetings:", error);
    return sendError(res, 500, error.message);
  }
};

export const dismissDuplicate = async (req, res) => {
  try {
    const { id: primaryId } = req.params;
    const { secondaryId } = req.body;

    if (!secondaryId) {
      return sendError(res, 400, "Secondary meeting ID is required");
    }

    const userId = req.user._id;
    await duplicateService.dismissDuplicate(primaryId, secondaryId, userId);
    return sendSuccess(res, {}, "Duplicate suggestion dismissed");
  } catch (error) {
    logger.error("Error dismissing duplicate:", error);
    return sendError(res, 500, error.message);
  }
};

export const rollbackMerge = async (req, res) => {
  try {
    const { mergeAuditId } = req.params;
    const userOrgId = req.user?.organization?.toString();
    const userId = req.user._id;

    const audit = await MergeAudit.findById(mergeAuditId).lean();
    if (!audit) return sendError(res, 404, "Merge audit record not found");
    if (audit.organization?.toString() !== userOrgId) {
      return sendError(res, 403, "Access denied");
    }

    const result = await duplicateService.rollbackMerge(mergeAuditId, userId);
    return sendSuccess(res, result, "Merge rolled back successfully");
  } catch (error) {
    logger.error("Error rolling back merge:", error);
    return sendError(res, 500, error.message);
  }
};
