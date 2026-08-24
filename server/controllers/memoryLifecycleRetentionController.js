import {
  getOrganizationLifecyclePolicyById,
  updateOrganizationLifecyclePolicy,
} from "../services/memoryLifecycleRetentionService.js";
import { sendError, sendSuccess } from "../utils/responseHandler.js";

const getOrganization = (req) => req.user?.organization || null;

export const getMemoryLifecycleRetentionPolicy = async (req, res) => {
  try {
    const organization = getOrganization(req);
    if (!organization) {
      return sendError(res, 400, "Organization context is required");
    }

    const result = await getOrganizationLifecyclePolicyById(organization);
    if (!result) {
      return sendError(res, 404, "Organization not found");
    }

    return sendSuccess(res, result);
  } catch (error) {
    console.error("getMemoryLifecycleRetentionPolicy error:", error);
    return sendError(res, 500, "Failed to load retention policy");
  }
};

export const updateMemoryLifecycleRetentionPolicy = async (req, res) => {
  try {
    const organization = getOrganization(req);
    if (!organization) {
      return sendError(res, 400, "Organization context is required");
    }

    const result = await updateOrganizationLifecyclePolicy(
      organization,
      req.body || {},
    );

    if (!result) {
      return sendError(res, 404, "Organization not found");
    }

    return sendSuccess(
      res,
      result,
      "Memory retention policy updated successfully",
    );
  } catch (error) {
    if (
      error.message?.includes("Retention") ||
      error.message?.includes("must be") ||
      error.message?.includes("Unsupported")
    ) {
      return sendError(res, 400, error.message);
    }

    console.error("updateMemoryLifecycleRetentionPolicy error:", error);
    return sendError(res, 500, "Failed to update retention policy");
  }
};

export default {
  getMemoryLifecycleRetentionPolicy,
  updateMemoryLifecycleRetentionPolicy,
};
