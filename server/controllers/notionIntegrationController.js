import NotionIntegration from "../models/notionIntegrationModel.js";
import {
  exchangeOAuthToken,
  fetchDatabases,
} from "../services/notionSyncService.js";

// Endpoint to start the OAuth flow
export const initiateOAuth = async (req, res) => {
  try {
    const clientId = process.env.NOTION_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({
        success: false,
        message: "Notion integration is not configured on the server.",
      });
    }

    // We pass the organization ID in the state to retrieve it in the callback
    const state = JSON.stringify({ organizationId: req.user.organization });
    const encodedState = Buffer.from(state).toString("base64");

    // The redirect URI must exactly match what is configured in the Notion Developer portal
    const redirectUri = encodeURIComponent(
      `${process.env.VITE_API_URL || "http://localhost:3000"}/api/integrations/notion/callback`,
    );

    const notionAuthUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&response_type=code&owner=user&redirect_uri=${redirectUri}&state=${encodedState}`;

    res.json({ success: true, url: notionAuthUrl });
  } catch (error) {
    console.error("Error initiating Notion OAuth:", error);
    res.status(500).json({
      success: false,
      message: "Failed to initiate Notion connection",
    });
  }
};

// Endpoint for OAuth callback
export const oauthCallback = async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).send(`Error from Notion: ${error}`);
    }

    let organizationId = null;
    if (state) {
      try {
        const decodedState = JSON.parse(
          Buffer.from(state, "base64").toString("utf-8"),
        );
        organizationId = decodedState.organizationId;
      } catch (err) {
        console.error("Error decoding state parameter:", err);
      }
    }

    if (!organizationId) {
      return res.status(400).send("Organization ID missing from OAuth state.");
    }

    const redirectUri = `${process.env.VITE_API_URL || "http://localhost:3000"}/api/integrations/notion/callback`;

    const tokenData = await exchangeOAuthToken(code, redirectUri);

    // Save or update the integration in the database
    await NotionIntegration.findOneAndUpdate(
      { organization: organizationId },
      {
        organization: organizationId,
        createdBy: tokenData.owner.user.id, // we might want req.user._id but we are in a callback. Let's rely on update or require user to be logged in.
        // Wait, callback might not have req.user if it's a direct redirect. But usually it's in the same browser session.
        accessToken: tokenData.access_token,
        workspaceId: tokenData.workspace_id,
        workspaceName: tokenData.workspace_name,
      },
      { upsert: true, new: true },
    );

    // Redirect back to frontend
    res.redirect(
      `${process.env.VITE_APP_URL || "http://localhost:5173"}/organizations/settings?integration=notion_success`,
    );
  } catch (error) {
    console.error("Error in Notion OAuth callback:", error);
    res.redirect(
      `${process.env.VITE_APP_URL || "http://localhost:5173"}/organizations/settings?integration=notion_error`,
    );
  }
};

// Endpoint to fetch available databases
export const getDatabases = async (req, res) => {
  try {
    const integration = await NotionIntegration.findOne({
      organization: req.user.organization,
    });
    if (!integration) {
      return res
        .status(404)
        .json({ success: false, message: "Notion integration not found" });
    }

    const databases = await fetchDatabases(integration.accessToken);
    res.json({ success: true, databases });
  } catch (error) {
    console.error("Error fetching Notion databases:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch databases from Notion",
    });
  }
};

// Endpoint to save mapping
export const saveMapping = async (req, res) => {
  try {
    const { targetDatabaseId } = req.body;

    const integration = await NotionIntegration.findOneAndUpdate(
      { organization: req.user.organization },
      { targetDatabaseId },
      { new: true },
    );

    if (!integration) {
      return res
        .status(404)
        .json({ success: false, message: "Notion integration not found" });
    }

    res.json({ success: true, integration });
  } catch (error) {
    console.error("Error saving Notion database mapping:", error);
    res.status(500).json({ success: false, message: "Failed to save mapping" });
  }
};

// Endpoint to get connection status
export const getStatus = async (req, res) => {
  try {
    const integration = await NotionIntegration.findOne({
      organization: req.user.organization,
    });

    if (!integration) {
      return res.json({ success: true, connected: false });
    }

    res.json({
      success: true,
      connected: true,
      workspaceName: integration.workspaceName,
      targetDatabaseId: integration.targetDatabaseId,
    });
  } catch (error) {
    console.error("Error fetching Notion status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch Notion connection status",
    });
  }
};

export const disconnect = async (req, res) => {
  try {
    await NotionIntegration.findOneAndDelete({
      organization: req.user.organization,
    });
    res.json({ success: true, message: "Notion disconnected successfully" });
  } catch (error) {
    console.error("Error disconnecting Notion:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to disconnect Notion" });
  }
};
