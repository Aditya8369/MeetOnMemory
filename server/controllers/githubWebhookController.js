import crypto from "crypto";
import ActionItem from "../models/actionItemModel.js";

// Webhook payload handler for GitHub
export const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-hub-signature-256"];
    const event = req.headers["x-github-event"];

    // Verify signature if GITHUB_WEBHOOK_SECRET is set
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (secret && signature) {
      const hmac = crypto.createHmac("sha256", secret);
      const digest =
        "sha256=" + hmac.update(JSON.stringify(req.body)).digest("hex");

      if (signature !== digest) {
        return res.status(401).json({ message: "Invalid signature" });
      }
    }

    // We only care about issues events for now
    if (event === "issues") {
      const { action, issue } = req.body;

      if (action === "closed") {
        const issueNumber = issue.number;

        // Find action item by external GitHub issue ID
        const actionItem = await ActionItem.findOne({
          externalGitHubIssueId: issueNumber,
        });

        if (actionItem) {
          actionItem.status = "completed"; // Or 'resolved' depending on your schema
          actionItem.resolvedAt = new Date();
          await actionItem.save();
          console.log(
            `ActionItem ${actionItem._id} completed via GitHub Webhook.`,
          );
        }
      }

      // If issue reopened, we could sync it back to "open" or "in-progress"
      if (action === "reopened") {
        const issueNumber = issue.number;
        const actionItem = await ActionItem.findOne({
          externalGitHubIssueId: issueNumber,
        });
        if (actionItem) {
          actionItem.status = "open";
          actionItem.resolvedAt = null;
          await actionItem.save();
          console.log(
            `ActionItem ${actionItem._id} reopened via GitHub Webhook.`,
          );
        }
      }
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("GitHub Webhook Error:", error);
    res.status(500).send("Server Error");
  }
};
