import { sendSuccess, sendError } from "../utils/responseHandler.js";
import { getAdminHealthReport } from "../services/adminHealthService.js";

/**
 * GET /api/admin/health
 * Authenticated endpoint for live dependency statuses and diagnostics (Issue #2082).
 */
export const getAdminHealth = async (req, res) => {
  try {
    const report = await getAdminHealthReport();
    return sendSuccess(res, report);
  } catch (error) {
    console.error("Error in getAdminHealth:", error);
    return sendError(res, 500, "Failed to load admin health status");
  }
};
