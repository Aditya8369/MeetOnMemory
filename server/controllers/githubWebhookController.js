import crypto from "crypto";
import WebhookDeliveryLog from "../models/webhookDeliveryLogModel.js";
import { handleGitHubIssueEvent } from "../services/githubSyncService.js";
import logger from "../utils/logger.js";

/**
 * Verify the GitHub webhook HMAC-SHA256 signature.
 * Returns true if valid or if verification is not configured.
 */
function verifySignature(req) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  const signature = req.headers["x-hub-signature-256"];

  if (!secret) return true;
  if (!signature) return false;

  const hmac = crypto.createHmac("sha256", secret);
  const digest =
    "sha256=" + hmac.update(JSON.stringify(req.body)).digest("hex");

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

/**
 * Compute a deterministic SHA-256 hash of the delivery for fallback
 * idempotency when X-GitHub-Delivery is missing.
 */
function computePayloadHash(body) {
  return crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

/**
 * GitHub webhook handler with idempotent delivery processing (Issue #1600).
 */
export const handleWebhook = async (req, res) => {
  try {
    if (!verifySignature(req)) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid signature" });
    }

    const event = req.headers["x-github-event"];
    const deliveryId =
      req.headers["x-github-delivery"] || computePayloadHash(req.body);

    const existingDelivery = await WebhookDeliveryLog.findOne({ deliveryId });
    if (existingDelivery) {
      return res
        .status(200)
        .json({ success: true, message: "Already processed" });
    }

    let result = { updated: false };

    if (event === "issues") {
      const { action, issue, repository } = req.body;
      result = await handleGitHubIssueEvent({ action, issue, repository });
    }

    try {
      await WebhookDeliveryLog.create({
        deliveryId,
        provider: "github",
        event: event || "unknown",
        action: req.body?.action || null,
      });
    } catch (dupErr) {
      if (dupErr?.code !== 11000) throw dupErr;
    }

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    logger.error("GitHub Webhook Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
