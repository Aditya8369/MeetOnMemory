import crypto from "crypto";
import WebhookDeliveryLog from "../models/webhookDeliveryLogModel.js";
import { handleGitHubIssueEvent } from "../services/githubSyncService.js";
import logger from "../utils/logger.js";

// Compute a deterministic SHA-256 hash of the delivery for fallback idempotency when X-GitHub-Delivery is missing
function computePayloadHash(body) {
  return crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

/**
 * GitHub webhook handler with idempotent delivery processing, secure HMAC verification, and tenant scoping.
 */
export const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-hub-signature-256"];
    const event = req.headers["x-github-event"];
    const secret = process.env.GITHUB_WEBHOOK_SECRET;

    // Mandate GITHUB_WEBHOOK_SECRET configuration
    if (!secret) {
      logger.error(
        "GitHub Webhook Error: GITHUB_WEBHOOK_SECRET is not configured",
      );
      return res.status(500).json({
        success: false,
        message:
          "Server configuration error: GITHUB_WEBHOOK_SECRET is not configured",
      });
    }

    // Mandate HMAC signature header presence
    if (!signature) {
      return res
        .status(401)
        .json({ success: false, message: "Signature is required" });
    }

    // Ensure raw request body buffer is captured
    if (!req.rawBody) {
      return res
        .status(400)
        .json({ success: false, message: "Missing raw request body buffer" });
    }

    // Verify HMAC signature using raw body buffer and timing-safe comparison
    const hmac = crypto.createHmac("sha256", secret);
    const digest = "sha256=" + hmac.update(req.rawBody).digest("hex");

    const digestBuffer = Buffer.from(digest);
    const signatureBuffer = Buffer.from(signature);

    if (
      digestBuffer.length !== signatureBuffer.length ||
      !crypto.timingSafeEqual(digestBuffer, signatureBuffer)
    ) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid signature" });
    }

    // Idempotent delivery processing (Issue #1600)
    const deliveryId =
      req.headers["x-github-delivery"] || computePayloadHash(req.body);

    const existingDelivery = await WebhookDeliveryLog.findOne({ deliveryId });
    if (existingDelivery) {
      return res
        .status(200)
        .json({ success: true, message: "Already processed" });
    }

    let result = { updated: false };

    // We only care about issues events for now
    if (event === "issues") {
      const { action, issue, repository } = req.body;
      result = await handleGitHubIssueEvent({ action, issue, repository });
    }

    // Log the delivery for idempotency
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
