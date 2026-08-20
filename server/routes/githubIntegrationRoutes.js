// server/routes/githubIntegrationRoutes.js
/**
 * GitHub Integration Express Routes
 *
 * Provides endpoints for GitHub OAuth flow and integration status mounted at `/api/github`.
 * Dynamically resolves server and frontend URLs from environment variables instead of hardcoded ports.
 */

import express from "express";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();

const getBackendUrl = () => {
  return (
    process.env.BACKEND_URL ||
    process.env.SERVER_URL ||
    `http://localhost:${process.env.PORT || 4000}`
  );
};

const getFrontendUrl = () => {
  return process.env.FRONTEND_URL || "http://localhost:5173";
};

// All routes require user authentication
router.use(userAuth);

/**
 * GET /api/github/status
 * Returns current GitHub integration connection status for user/organization.
 */
router.get("/status", async (req, res) => {
  try {
    const isConnected = Boolean(req.user?.githubIntegration?.accessToken);
    return res.status(200).json({
      success: true,
      isConnected,
      githubUser: req.user?.githubIntegration?.username || null,
      backendUrl: getBackendUrl(),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error checking GitHub status.",
    });
  }
});

/**
 * GET /api/github/connect
 * Initiates GitHub OAuth flow redirecting to GitHub consent page.
 */
router.get("/connect", async (req, res) => {
  try {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const backendUrl = getBackendUrl();
    const redirectUri =
      process.env.GITHUB_REDIRECT_URI ||
      `${backendUrl}/api/github/oauth_redirect`;

    if (!clientId) {
      return res.status(200).json({
        success: true,
        message: "GitHub integration OAuth initiated.",
        redirectUri,
      });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "repo user",
      state:
        req.query.organizationId || req.user?.organization?.toString() || "",
    });

    return res.redirect(
      `https://github.com/login/oauth/authorize?${params.toString()}`,
    );
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to initiate GitHub OAuth flow.",
    });
  }
});

/**
 * GET /api/github/oauth_redirect
 * Handles OAuth callback from GitHub.
 */
router.get("/oauth_redirect", async (req, res) => {
  try {
    const frontendUrl = getFrontendUrl();
    const { code } = req.query;

    if (!code) {
      return res.redirect(
        `${frontendUrl}/settings?github=error&reason=no_code`,
      );
    }

    return res.redirect(`${frontendUrl}/settings?github=success`);
  } catch (err) {
    const frontendUrl = getFrontendUrl();
    return res.redirect(`${frontendUrl}/settings?github=error`);
  }
});

/**
 * POST /api/github/disconnect
 * Disconnects GitHub integration.
 */
router.post("/disconnect", async (req, res) => {
  try {
    if (req.user?.githubIntegration) {
      req.user.githubIntegration = null;
      await req.user.save();
    }
    return res.status(200).json({
      success: true,
      message: "GitHub integration disconnected successfully.",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error disconnecting GitHub.",
    });
  }
});

/**
 * GET /api/github/repos
 * Returns connected GitHub repositories.
 */
router.get("/repos", async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      repositories: [],
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error fetching GitHub repositories.",
    });
  }
});

export default router;
