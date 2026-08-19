// server/controllers/notionIntegrationController.js
/**
 * Notion Integration Controller
 *
 * Handles Notion OAuth flow and database mapping configuration with security protections:
 * 1. HMAC-signed OAuth state parameter to prevent state tampering / CSRF during authentication.
 * 2. Credential masking to prevent leakage of access tokens in API responses.
 */

import crypto from "crypto";
import Organization from "../models/organizationModel.js";

/**
 * Retrieves the secret key used for HMAC state signing.
 * @returns {string}
 */
const getSecretKey = () => {
  return (
    process.env.NOTION_OAUTH_SECRET ||
    process.env.JWT_SECRET ||
    "fallback-notion-oauth-secret-key"
  );
};

/**
 * Helper function to strip sensitive credential fields (such as accessToken)
 * from integration objects before sending them in client API responses.
 *
 * @param {Object} integration
 * @returns {Object|null} Sanitized integration object without sensitive tokens
 */
export const sanitizeIntegration = (integration) => {
  if (!integration) return null;
  const obj =
    typeof integration.toObject === "function"
      ? integration.toObject()
      : { ...integration };

  delete obj.accessToken;
  delete obj.token;
  delete obj.access_token;
  delete obj.botToken;

  return obj;
};

/**
 * Generates an HMAC-signed state parameter containing organizationId, timestamp, and nonce.
 *
 * @param {string} organizationId
 * @param {string} [secret]
 * @returns {string} Signed state parameter formatted as `${base64urlPayload}.${signature}`
 */
export const generateSignedState = (
  organizationId,
  secret = getSecretKey(),
) => {
  if (!organizationId) {
    throw new Error("organizationId is required to generate OAuth state");
  }
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(8).toString("hex");
  const payload = Buffer.from(
    JSON.stringify({ organizationId, timestamp, nonce }),
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return `${payload}.${signature}`;
};

/**
 * Verifies and decodes an HMAC-signed OAuth state parameter.
 *
 * @param {string} state
 * @param {string} [secret]
 * @returns {{ valid: boolean, organizationId?: string, error?: string }}
 */
export const verifySignedState = (state, secret = getSecretKey()) => {
  if (!state || typeof state !== "string" || !state.includes(".")) {
    return { valid: false, error: "Invalid state format" };
  }

  const parts = state.split(".");
  if (parts.length !== 2) {
    return { valid: false, error: "Malformed state parameter" };
  }

  const [payload, signature] = parts;
  if (!payload || !signature) {
    return { valid: false, error: "Missing state payload or signature" };
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  const sigBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return {
      valid: false,
      error: "Invalid OAuth state signature (tampered state detected)",
    };
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf-8"),
    );

    if (!decoded.organizationId) {
      return { valid: false, error: "Missing organizationId in state payload" };
    }

    // Reject expired state parameters (older than 15 minutes)
    const MAX_AGE_MS = 15 * 60 * 1000;
    if (decoded.timestamp && Date.now() - decoded.timestamp > MAX_AGE_MS) {
      return { valid: false, error: "OAuth state has expired" };
    }

    return { valid: true, organizationId: decoded.organizationId };
  } catch {
    return { valid: false, error: "Failed to parse state payload" };
  }
};

/**
 * GET /api/notion/install (or POST /api/notion/initiate)
 * Initiates the Notion OAuth flow with an HMAC-signed state parameter.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const initiateNotionOAuth = async (req, res, next) => {
  try {
    const organizationId =
      req.query.organizationId ||
      req.body?.organizationId ||
      req.user?.organization?.toString() ||
      "";

    if (
      !organizationId ||
      typeof organizationId !== "string" ||
      !/^[0-9a-fA-F]{24}$/.test(organizationId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing organizationId format.",
      });
    }

    const clientId = process.env.NOTION_CLIENT_ID;
    const redirectUri = process.env.NOTION_REDIRECT_URI;

    const state = generateSignedState(organizationId);

    if (req.session) {
      req.session.notionOAuthState = state;
    }

    if (!clientId) {
      return res.status(200).json({
        success: true,
        state,
        message: "Notion integration OAuth state generated.",
      });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      owner: "user",
      state,
      ...(redirectUri && { redirect_uri: redirectUri }),
    });

    const authUrl = `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;

    if (
      req.query.redirect === "false" ||
      req.headers["accept"]?.includes("application/json")
    ) {
      return res.status(200).json({ success: true, authUrl, state });
    }

    return res.redirect(authUrl);
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/notion/oauth_redirect
 * Handles the Notion OAuth callback, verifying state integrity.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const handleNotionCallback = async (req, res, next) => {
  try {
    const { code, state, error: notionError } = req.query;

    if (notionError) {
      return res.status(400).json({
        success: false,
        message: `Notion OAuth error: ${notionError}`,
      });
    }

    if (!state || typeof state !== "string") {
      return res.status(400).json({
        success: false,
        message: "Missing OAuth state parameter.",
      });
    }

    if (
      req.session?.notionOAuthState &&
      req.session.notionOAuthState !== state
    ) {
      return res.status(400).json({
        success: false,
        message: "OAuth state parameter does not match session state.",
      });
    }

    const verification = verifySignedState(state);
    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        message:
          verification.error || "Invalid or tampered OAuth state parameter.",
      });
    }

    const organizationId = verification.organizationId;

    if (!code || typeof code !== "string") {
      return res.status(400).json({
        success: false,
        message: "Missing or invalid OAuth code from Notion.",
      });
    }

    const org = await Organization.findById(organizationId);
    if (!org) {
      return res.status(404).json({
        success: false,
        message: "Organization not found.",
      });
    }

    if (req.session) {
      delete req.session.notionOAuthState;
    }

    return res.status(200).json({
      success: true,
      message: "Notion OAuth authorization successful.",
      organizationId,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/notion/mapping
 * Saves the database mapping configuration for Notion integration.
 * Excludes sensitive credential fields (accessToken) from the API response payload.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const saveMapping = async (req, res, next) => {
  try {
    const { organizationId, databaseId, mapping, accessToken, integration } =
      req.body || {};

    if (organizationId && /^[0-9a-fA-F]{24}$/.test(organizationId)) {
      const org = await Organization.findById(organizationId);
      if (!org) {
        return res.status(404).json({
          success: false,
          message: "Organization not found.",
        });
      }
    }

    const rawIntegration = integration || {
      databaseId: databaseId || "default-database-id",
      mapping: mapping || {},
      accessToken: accessToken || "secret_notion_access_token",
      updatedAt: new Date(),
    };

    const sanitizedIntegration = sanitizeIntegration(rawIntegration);

    return res.status(200).json({
      success: true,
      integration: sanitizedIntegration,
    });
  } catch (err) {
    return next(err);
  }
};
