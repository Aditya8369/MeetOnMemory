import { sendSuccess, sendError } from "../utils/responseHandler.js";
import { getOrgAiUsageMetrics } from "../services/aiUsageMetricsService.js";

/**
 * GET /api/admin/ai-usage
 * Org AI cost/usage meter for admins (Issue #2083).
 */
export const getAdminAiUsage = async (req, res) => {
  try {
    const organizationId =
      req.user?.organization?._id || req.user?.organization || null;
    if (!organizationId) {
      return sendError(res, 400, "No organization associated with this user");
    }

    const metrics = await getOrgAiUsageMetrics({
      organizationId,
      from: req.query.from,
      to: req.query.to,
    });

    return sendSuccess(res, metrics);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.statusCode, error.message);
    }
    console.error("Error in getAdminAiUsage:", error);
    return sendError(res, 500, "Failed to load AI usage metrics");
  }
};
