import ActionItem from "../models/actionItemModel.js";
import crypto from "crypto";

/**
 * Handle incoming webhooks from Jira
 */
export const handleJiraWebhook = async (req, res) => {
  try {
    // In a real app, verify webhook signature using req.headers and integration.webhookSecret
    // For simplicity, we just process the payload.
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

    res.status(200).send("OK");
  } catch (error) {
    console.error("Error processing Jira webhook:", error);
    res.status(500).send("Server Error");
  }
};

/**
 * Handle incoming webhooks from Linear
 */
export const handleLinearWebhook = async (req, res) => {
  try {
    // Linear sends a signature in the 'Linear-Signature' header
    // In production, we'd verify using crypto.createHmac('sha256', secret).update(rawBody).digest('hex')

    const payload = req.body;

    if (payload.action === "update" && payload.type === "Issue") {
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

    res.status(200).send("OK");
  } catch (error) {
    console.error("Error processing Linear webhook:", error);
    res.status(500).send("Server Error");
  }
};
