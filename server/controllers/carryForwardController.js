import carryForwardService from "../services/carryForwardService.js";
import { AppError } from "../utils/errors.js";

/**
 * Tenant for carry-forward is always the authenticated user's organization.
 * Client-supplied organizationId (body/query/params) is ignored (Issue #1666).
 */
const getAuthenticatedOrganizationId = (req) => req.user?.organization || null;

const sendCarryForwardError = (res, error, fallbackMessage) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }
  console.error(fallbackMessage, error);
  return res
    .status(500)
    .json({ success: false, message: "Internal server error" });
};

export const getConfig = async (req, res) => {
  try {
    const { seriesId } = req.params;
    const organizationId = getAuthenticatedOrganizationId(req);
    const config = await carryForwardService.getConfig(
      seriesId,
      organizationId,
    );
    res.status(200).json({ success: true, config });
  } catch (error) {
    sendCarryForwardError(res, error, "Error getting carry forward config:");
  }
};

export const updateConfig = async (req, res) => {
  try {
    const { seriesId } = req.params;
    const { carryForwardRules } = req.body;
    const organizationId = getAuthenticatedOrganizationId(req);
    const config = await carryForwardService.updateConfig(
      seriesId,
      carryForwardRules,
      organizationId,
    );
    res.status(200).json({ success: true, config });
  } catch (error) {
    sendCarryForwardError(res, error, "Error updating carry forward config:");
  }
};

export const getPreview = async (req, res) => {
  try {
    const { seriesId } = req.params;
    const organizationId = getAuthenticatedOrganizationId(req);
    const preview = await carryForwardService.getCarryForwardPreview(
      seriesId,
      organizationId,
    );
    res.status(200).json({ success: true, preview });
  } catch (error) {
    sendCarryForwardError(
      res,
      error,
      "Error generating carry forward preview:",
    );
  }
};

export const applyCarryForward = async (req, res) => {
  try {
    const { seriesId } = req.params;
    const { currentMeetingId } = req.body;
    const organizationId = getAuthenticatedOrganizationId(req);

    if (!currentMeetingId) {
      return res
        .status(400)
        .json({ success: false, message: "currentMeetingId is required" });
    }

    const result = await carryForwardService.applyCarryForward(
      seriesId,
      currentMeetingId,
      organizationId,
    );
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    sendCarryForwardError(res, error, "Error applying carry forward:");
  }
};
