import GithubIntegration from "../models/githubIntegrationModel.js";
import ActionItem from "../models/actionItemModel.js";
import { syncActionItemToGitHub } from "../services/githubSyncService.js";
import { encryptToken, decryptToken } from "../utils/crypto.js";
import { sendSuccess, sendError } from "../utils/responseHandler.js";
import { ValidationError } from "../utils/errors.js";
import axios from "axios";
import logger from "../utils/logger.js";

export const initiateOAuth = async (req, res) => {
  try {
    const organizationId =
      req.query.organizationId || req.user?.organization?.toString();
    if (!organizationId) {
      return sendError(res, 400, "organizationId is required.");
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      return sendError(
        res,
        500,
        "GitHub OAuth is not configured on the server.",
      );
    }

    const state = Buffer.from(JSON.stringify({ organizationId })).toString(
      "base64",
    );

    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo&state=${state}`;
    res.redirect(githubAuthUrl);
  } catch (error) {
    logger.error("GitHub Auth Error:", error);
    sendError(res, 500, "Failed to initiate GitHub OAuth.");
  }
};

export const handleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) {
      return sendError(res, 400, "Authorization code is missing.");
    }

    let decodedState;
    try {
      decodedState = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
    } catch {
      return sendError(res, 400, "Invalid state parameter.");
    }

    const { organizationId, repositoryFullName } = decodedState;

    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: "application/json" } },
    );

    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) {
      return sendError(res, 400, "Failed to obtain access token.");
    }

    await GithubIntegration.findOneAndUpdate(
      { organization: organizationId },
      {
        organization: organizationId,
        accessToken: encryptToken(accessToken),
        repositoryFullName: repositoryFullName || "",
        connectedBy: req.user?._id || null,
      },
      { upsert: true, new: true },
    );

    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    res.redirect(
      `${clientUrl}/organization/settings?tab=integrations&github_success=true`,
    );
  } catch (error) {
    logger.error("GitHub Callback Error:", error);
    sendError(res, 500, "Failed to handle GitHub callback.");
  }
};

export const getStatus = async (req, res) => {
  try {
    const organizationId = req.params.organizationId;
    const integration = await GithubIntegration.findOne({
      organization: organizationId,
    });

    if (!integration) {
      return sendSuccess(res, { isConnected: false });
    }

    return sendSuccess(res, {
      isConnected: true,
      repositoryFullName: integration.repositoryFullName,
    });
  } catch (error) {
    logger.error("Get Status Error:", error);
    sendError(res, 500, "Failed to get GitHub integration status.");
  }
};

export const disconnect = async (req, res) => {
  try {
    const organizationId = req.params.organizationId;
    await GithubIntegration.findOneAndDelete({ organization: organizationId });
    return sendSuccess(res, {}, "Disconnected successfully.");
  } catch (error) {
    logger.error("Disconnect Error:", error);
    sendError(res, 500, "Failed to disconnect GitHub.");
  }
};

/**
 * Update the linked repository for an organization (Issue #1600).
 */
export const updateRepository = async (req, res) => {
  try {
    const organizationId = req.params.organizationId;
    const { repositoryFullName } = req.body;

    if (
      !repositoryFullName ||
      typeof repositoryFullName !== "string" ||
      !repositoryFullName.includes("/")
    ) {
      throw new ValidationError(
        "repositoryFullName is required and must be in 'owner/repo' format.",
      );
    }

    const integration = await GithubIntegration.findOne({
      organization: organizationId,
    });
    if (!integration) {
      return sendError(
        res,
        404,
        "GitHub integration not found for this organization.",
      );
    }

    integration.repositoryFullName = repositoryFullName.trim();
    await integration.save();

    return sendSuccess(
      res,
      {
        repositoryFullName: integration.repositoryFullName,
      },
      "Repository updated.",
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendError(res, 400, error.message);
    }
    logger.error("Update Repository Error:", error);
    sendError(res, 500, "Failed to update repository.");
  }
};

/**
 * Manually trigger sync of a specific action item to GitHub (Issue #1600).
 */
export const syncActionItem = async (req, res) => {
  try {
    const { actionItemId } = req.body;
    if (!actionItemId) {
      throw new ValidationError("actionItemId is required.");
    }

    const userOrgId = req.user?.organization?.toString();
    const actionItem = await ActionItem.findById(actionItemId);
    if (!actionItem) {
      return sendError(res, 404, "Action item not found.");
    }

    const itemOrgId = actionItem.organization?.toString();
    if (itemOrgId && userOrgId && itemOrgId !== userOrgId) {
      return sendError(res, 403, "You do not have access to this action item.");
    }

    const result = await syncActionItemToGitHub(actionItem);
    if (!result) {
      return sendError(
        res,
        400,
        "No GitHub integration configured for this organization.",
      );
    }

    return sendSuccess(
      res,
      {
        githubIssueNumber: result.number,
        githubIssueUrl: result.html_url,
        alreadySynced: result.alreadySynced || false,
      },
      result.alreadySynced
        ? "Action item was already synced."
        : "Action item synced to GitHub.",
      result.alreadySynced ? 200 : 201,
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return sendError(res, 400, error.message);
    }
    logger.error("Sync Action Item Error:", error);
    sendError(res, 500, "Failed to sync action item to GitHub.");
  }
};
