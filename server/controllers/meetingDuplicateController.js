import * as duplicateService from "../services/meetingDuplicateService.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";

export const detectDuplicates = async (req, res) => {
  try {
    const { id } = req.params;
    const duplicates = await duplicateService.findDuplicates(id);
    return sendSuccess(res, { duplicates }, "Duplicates fetched successfully");
  } catch (error) {
    console.error("Error detecting duplicates:", error);
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

    const userId = req.user._id;

    const result = await duplicateService.mergeMeetings(
      primaryId,
      secondaryId,
      userId,
    );
    return sendSuccess(res, result, "Meetings merged successfully");
  } catch (error) {
    console.error("Error merging meetings:", error);
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
    console.error("Error dismissing duplicate:", error);
    return sendError(res, 500, error.message);
  }
};
