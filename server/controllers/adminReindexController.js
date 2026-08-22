import { sendSuccess, sendError } from "../utils/responseHandler.js";
import {
  enqueueMeetingReindex,
  enqueueOrgReindex,
  getReindexJobStatus,
  listOrgEmbeddingStatus,
} from "../services/adminReindexService.js";

const orgIdFromReq = (req) =>
  req.user?.organization?._id || req.user?.organization || null;

export const getEmbeddingAdminStatus = async (req, res) => {
  try {
    const organizationId = orgIdFromReq(req);
    if (!organizationId) {
      return sendError(res, 400, "No organization associated with this user");
    }

    const payload = await listOrgEmbeddingStatus({
      organizationId,
      limit: req.query.limit,
    });
    return sendSuccess(res, payload);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.statusCode, error.message);
    }
    console.error("Error in getEmbeddingAdminStatus:", error);
    return sendError(res, 500, "Failed to load embedding status");
  }
};

export const getEmbeddingJobStatus = async (req, res) => {
  try {
    const status = await getReindexJobStatus(req.params.jobId);
    return sendSuccess(res, status);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.statusCode, error.message);
    }
    console.error("Error in getEmbeddingJobStatus:", error);
    return sendError(res, 500, "Failed to load job status");
  }
};

export const postReindexMeeting = async (req, res) => {
  try {
    const organizationId = orgIdFromReq(req);
    const result = await enqueueMeetingReindex({
      organizationId,
      meetingId: req.params.meetingId,
    });
    return sendSuccess(res, result, "Meeting reindex queued", 202);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.statusCode, error.message);
    }
    console.error("Error in postReindexMeeting:", error);
    return sendError(res, 500, "Failed to enqueue meeting reindex");
  }
};

export const postReindexOrg = async (req, res) => {
  try {
    const organizationId = orgIdFromReq(req);
    const result = await enqueueOrgReindex({ organizationId });
    return sendSuccess(res, result, "Organization reindex queued", 202);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.statusCode, error.message);
    }
    console.error("Error in postReindexOrg:", error);
    return sendError(res, 500, "Failed to enqueue organization reindex");
  }
};
