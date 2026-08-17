import GithubIntegration from "../models/githubIntegrationModel.js";
import axios from "axios";

// Environment variables needed:
// GITHUB_CLIENT_ID
// GITHUB_CLIENT_SECRET
// CLIENT_URL

export const initiateOAuth = async (req, res) => {
  try {
    const { organizationId } = req.query;
    if (!organizationId) {
      return res.status(400).json({ message: "organizationId is required" });
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      return res
        .status(500)
        .json({ message: "GitHub OAuth is not configured on the server." });
    }

    // Include state to prevent CSRF and pass along organizationId
    const state = Buffer.from(JSON.stringify({ organizationId })).toString(
      "base64",
    );

    // Redirect to GitHub
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo&state=${state}`;
    res.redirect(githubAuthUrl);
  } catch (error) {
    console.error("GitHub Auth Error:", error);
    res.status(500).json({ message: "Failed to initiate GitHub OAuth" });
  }
};

export const handleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) {
      return res.status(400).json({ message: "Code is missing" });
    }

    // Decode state
    let decodedState;
    try {
      decodedState = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
    } catch (_e) {
      return res.status(400).json({ message: "Invalid state parameter" });
    }

    const { organizationId, repositoryFullName } = decodedState;

    // Exchange code for token
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      {
        headers: { Accept: "application/json" },
      },
    );

    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) {
      return res.status(400).json({ message: "Failed to obtain access token" });
    }

    // We still need the user to specify a repository.
    // If it was provided in the state (e.g. from frontend redirect), we can save it.
    // Otherwise, we might save the token and have them choose the repo in a separate step.
    // For this flow, let's assume the user already selected the repo on the frontend,
    // OR we will update it via another endpoint. Let's just save the token first.

    await GithubIntegration.findOneAndUpdate(
      { organization: organizationId },
      {
        organization: organizationId,
        accessToken,
        // If repo wasn't in state, we default to something or require a subsequent update
        repositoryFullName: repositoryFullName || "imuniqueshiv/MeetOnMemory",
        connectedBy: req.user?._id || null, // Assuming standard auth middleware sets req.user
      },
      { upsert: true, new: true },
    );

    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    res.redirect(
      `${clientUrl}/organization/settings?tab=integrations&github_success=true`,
    );
  } catch (error) {
    console.error("GitHub Callback Error:", error);
    res.status(500).json({ message: "Failed to handle GitHub callback" });
  }
};

export const getStatus = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const integration = await GithubIntegration.findOne({
      organization: organizationId,
    });

    if (!integration) {
      return res.status(200).json({ isConnected: false });
    }

    return res.status(200).json({
      isConnected: true,
      repositoryFullName: integration.repositoryFullName,
    });
  } catch (error) {
    console.error("Get Status Error:", error);
    res
      .status(500)
      .json({ message: "Failed to get GitHub integration status" });
  }
};

export const disconnect = async (req, res) => {
  try {
    const { organizationId } = req.params;
    await GithubIntegration.findOneAndDelete({ organization: organizationId });
    return res.status(200).json({ message: "Disconnected successfully" });
  } catch (error) {
    console.error("Disconnect Error:", error);
    res.status(500).json({ message: "Failed to disconnect GitHub" });
  }
};
