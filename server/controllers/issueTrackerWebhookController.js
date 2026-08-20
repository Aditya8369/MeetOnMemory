import ActionItem from "../models/actionItemModel.js";
import crypto from "crypto";

/**
 * Helper to verify Linear webhook signature using HMAC-SHA256 and timing-safe comparison.
 * Linear passes the HMAC digest in the `Linear-Signature` header.
 */
export const verifyLinearSignature = (req) => {
  const secret = process.env.LINEAR_WEBHOOK_SECRET;
  if (!secret) {
    return {
      isValid: false,
      reason: "LINEAR_WEBHOOK_SECRET is not configured",
    };
  }

  const signature =
    req.headers["linear-signature"] || req.headers["x-linear-signature"];
  if (!signature) {
    return { isValid: false, reason: "Missing Linear signature header" };
  }

  const rawPayload = req.rawBody
    ? req.rawBody
    : typeof req.body === "string"
      ? req.body
      : JSON.stringify(req.body);

  const computedHex = crypto
    .createHmac("sha256", secret)
    .update(rawPayload)
    .digest("hex");

  const sigBuf = Buffer.from(String(signature).toLowerCase());
  const compBuf = Buffer.from(computedHex.toLowerCase());

  if (
    sigBuf.length !== compBuf.length ||
    !crypto.timingSafeEqual(sigBuf, compBuf)
  ) {
    return { isValid: false, reason: "Invalid Linear signature" };
  }

  return { isValid: true };
};

/**
 * Helper to verify Jira webhook signature or bearer token authorization.
 * Jira passes authorization tokens or signatures in `authorization` or `x-jira-signature` headers.
 */
export const verifyJiraSignature = (req) => {
  const secret = process.env.JIRA_WEBHOOK_SECRET;
  if (!secret) {
    return { isValid: false, reason: "JIRA_WEBHOOK_SECRET is not configured" };
  }

  const signature =
    req.headers["x-jira-signature"] ||
    req.headers["x-hub-signature"] ||
    req.headers["authorization"] ||
    req.headers["x-atlassian-webhook-secret"];

  if (!signature) {
    return {
      isValid: false,
      reason: "Missing Jira authorization header or signature",
    };
  }

  const rawPayload = req.rawBody
    ? req.rawBody
    : typeof req.body === "string"
      ? req.body
      : JSON.stringify(req.body);

  if (signature.startsWith("sha256=")) {
    const signatureHash = signature.slice(7);
    const computedHash = crypto
      .createHmac("sha256", secret)
      .update(rawPayload)
      .digest("hex");

    const sigBuf = Buffer.from(signatureHash.toLowerCase());
    const compBuf = Buffer.from(computedHash.toLowerCase());

    if (
      sigBuf.length !== compBuf.length ||
      !crypto.timingSafeEqual(sigBuf, compBuf)
    ) {
      return { isValid: false, reason: "Invalid Jira HMAC signature" };
    }
  } else {
    const token = signature.replace(/^Bearer\s+/i, "");
    const tokenBuf = Buffer.from(token);
    const secretBuf = Buffer.from(secret);

    if (
      tokenBuf.length !== secretBuf.length ||
      !crypto.timingSafeEqual(tokenBuf, secretBuf)
    ) {
      return { isValid: false, reason: "Invalid Jira secret token" };
    }
  }

  return { isValid: true };
};

/**
 * Handle incoming webhooks from Jira
 */
export const handleJiraWebhook = async (req, res) => {
  try {
    // Verify webhook signature / authorization
    const verification = verifyJiraSignature(req);
    if (!verification.isValid) {
      return res.status(401).json({
        success: false,
        message: verification.reason,
      });
    }

    const payload = req.body;

    // Jira webhook payloads usually have `webhookEvent`, `issue`, etc.
    if (payload && payload.issue && payload.issue.key) {
      const issueKey = payload.issue.key;
      const statusName = payload.issue.fields?.status?.name?.toLowerCase();

      // Simple status mapping
      let newStatus = null;
      if (
        statusName === "done" ||
        statusName === "completed" ||
        statusName === "closed"
      ) {
        newStatus = "completed";
      } else if (statusName === "in progress") {
        newStatus = "in-progress";
      } else if (statusName === "to do" || statusName === "open") {
        newStatus = "open";
      }

      if (newStatus) {
        // Find corresponding ActionItem
        const actionItem = await ActionItem.findOne({
          externalJiraIssueId: issueKey,
        });
        if (actionItem && actionItem.status !== newStatus) {
          actionItem.status = newStatus;
          if (newStatus === "completed") {
            actionItem.completedAt = new Date();
          }
          await actionItem.save();
        }
      }
    }

    return res.status(200).send("OK");
  } catch (error) {
    console.error("Error processing Jira webhook:", error);
    return res.status(500).send("Server Error");
  }
};

/**
 * Handle incoming webhooks from Linear
 */
export const handleLinearWebhook = async (req, res) => {
  try {
    // Verify webhook signature using Linear-Signature header
    const verification = verifyLinearSignature(req);
    if (!verification.isValid) {
      return res.status(401).json({
        success: false,
        message: verification.reason,
      });
    }

    const payload = req.body;

    if (payload && payload.action === "update" && payload.type === "Issue") {
      const issueId = payload.data?.id;
      const stateName = payload.data?.state?.name?.toLowerCase();

      // Simple status mapping based on typical Linear states
      let newStatus = null;
      if (
        stateName === "done" ||
        stateName === "completed" ||
        stateName === "canceled"
      ) {
        newStatus = "completed";
      } else if (stateName === "in progress") {
        newStatus = "in-progress";
      } else if (stateName === "todo" || stateName === "backlog") {
        newStatus = "open";
      }

      if (issueId && newStatus) {
        const actionItem = await ActionItem.findOne({
          externalLinearIssueId: issueId,
        });
        if (actionItem && actionItem.status !== newStatus) {
          actionItem.status = newStatus;
          if (newStatus === "completed") {
            actionItem.completedAt = new Date();
          }
          await actionItem.save();
        }
      }
    }

    return res.status(200).send("OK");
  } catch (error) {
    console.error("Error processing Linear webhook:", error);
    return res.status(500).send("Server Error");
  }
};
