import { sendSuccess, sendError } from "../utils/responseHandler.js";
import WorkloadService from "../services/workloadService.js";

export const getWorkload = async (req, res) => {
  try {
    const organizationId =
      req.headers["x-organization-id"] || req.user.currentOrganization;
    if (!organizationId) {
      return sendError(res, 400, "Organization ID is required.");
    }
    const workload = await WorkloadService.getWorkload(organizationId);
    return sendSuccess(res, workload);
  } catch (error) {
    console.error("Error fetching workload:", error);
    return sendError(res, 500, "Internal Server Error");
  }
};

export const suggestRebalance = async (req, res) => {
  try {
    const organizationId =
      req.headers["x-organization-id"] || req.user.currentOrganization;
    if (!organizationId) {
      return sendError(res, 400, "Organization ID is required.");
    }
    const result = await WorkloadService.suggestRebalance(organizationId);
    return sendSuccess(res, result);
  } catch (error) {
    console.error("Error suggesting rebalance:", error);
    return sendError(res, 500, "Internal Server Error");
  }
};

export const executeRebalance = async (req, res) => {
  try {
    const organizationId =
      req.headers["x-organization-id"] || req.user.currentOrganization;
    if (!organizationId) {
      return sendError(res, 400, "Organization ID is required.");
    }
    const { reassignments } = req.body;
    if (!reassignments || !Array.isArray(reassignments)) {
      return sendError(res, 400, "Invalid reassignments array.");
    }

    const io = req.app.get("io");
    const results = await WorkloadService.executeRebalance(
      organizationId,
      reassignments,
      req.user._id,
      io,
    );
    return sendSuccess(res, { results });
  } catch (error) {
    console.error("Error executing rebalance:", error);
    return sendError(res, 500, "Internal Server Error");
  }
};
