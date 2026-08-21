import { sendSuccess, sendError } from "../utils/responseHandler.js";
import {
  getAdminJobsDashboard,
  retryFailedJob,
  discardFailedJob,
} from "../services/adminJobsService.js";

/**
 * GET /api/admin/jobs
 * Queue depths + recent failed jobs for the admin Jobs board (Issue #2080).
 */
export const getAdminJobs = async (req, res) => {
  try {
    const dashboard = await getAdminJobsDashboard({
      failedLimit: req.query.failedLimit,
    });
    return sendSuccess(res, dashboard);
  } catch (error) {
    console.error("Error in getAdminJobs:", error);
    return sendError(res, 500, "Failed to load job dashboard");
  }
};

/**
 * POST /api/admin/jobs/:queueName/:jobId/retry
 */
export const retryAdminJob = async (req, res) => {
  try {
    const { queueName, jobId } = req.params;
    const result = await retryFailedJob(queueName, jobId);
    return sendSuccess(res, result, "Job queued for retry");
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.statusCode, error.message);
    }
    console.error("Error in retryAdminJob:", error);
    return sendError(res, 500, "Failed to retry job");
  }
};

/**
 * DELETE /api/admin/jobs/:queueName/:jobId
 */
export const discardAdminJob = async (req, res) => {
  try {
    const { queueName, jobId } = req.params;
    const result = await discardFailedJob(queueName, jobId);
    return sendSuccess(res, result, "Failed job discarded");
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.statusCode, error.message);
    }
    console.error("Error in discardAdminJob:", error);
    return sendError(res, 500, "Failed to discard job");
  }
};
