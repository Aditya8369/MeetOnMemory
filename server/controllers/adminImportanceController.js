import { sendSuccess, sendError } from "../utils/responseHandler.js";
import {
  enqueueImportanceRecalculation,
  getOrgImportanceRecalculationStatus,
} from "../services/adminImportanceService.js";

const orgIdFromReq = (req) =>
  req.user?.organization?._id || req.user?.organization || null;

/**
 * GET /api/admin/importance/status
 * Fetches status of importance recalculation queue, active job state, and last recalculation timestamps.
 */
export const getImportanceRecalculationStatus = async (req, res) => {
  try {
    const organizationId = orgIdFromReq(req);
    if (!organizationId) {
      return sendError(res, 400, "No organization associated with this user");
    }

    const payload = await getOrgImportanceRecalculationStatus({
      organizationId,
    });
    return sendSuccess(res, payload);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.statusCode, error.message);
    }
    console.error("Error in getImportanceRecalculationStatus:", error);
    return sendError(
      res,
      500,
      "Failed to load importance recalculation status",
    );
  }
};

/**
 * POST /api/admin/importance/recalculate
 * Triggers background or sync importance recalculation for the caller's organization.
 */
export const triggerImportanceRecalculation = async (req, res) => {
  try {
    const organizationId = orgIdFromReq(req);
    if (!organizationId) {
      return sendError(res, 400, "No organization associated with this user");
    }

    const result = await enqueueImportanceRecalculation({
      organizationId,
      actorId: req.user?._id,
    });
    return sendSuccess(
      res,
      result,
      "Importance score recalculation triggered successfully",
      202,
    );
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.statusCode, error.message);
    }
    console.error("Error in triggerImportanceRecalculation:", error);
    return sendError(
      res,
      500,
      "Failed to trigger importance score recalculation",
    );
  }
};
