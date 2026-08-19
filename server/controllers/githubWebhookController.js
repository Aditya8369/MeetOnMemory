import crypto from "crypto";
import ActionItem from "../models/actionItemModel.js";
import GithubIntegration from "../models/githubIntegrationModel.js";

// Webhook payload handler for GitHub
export const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-hub-signature-256"];
    const event = req.headers["x-github-event"];
    const secret = process.env.GITHUB_WEBHOOK_SECRET;

    // Mandate GITHUB_WEBHOOK_SECRET configuration
    if (!secret) {
      return res.status(500).json({
        message:
          "Server configuration error: GITHUB_WEBHOOK_SECRET is not configured",
      });
    }

    // Mandate HMAC signature header presence
    if (!signature) {
      return res.status(401).json({ message: "Signature is required" });
    }

    // Ensure raw request body buffer is captured
    if (!req.rawBody) {
      return res
        .status(400)
        .json({ message: "Missing raw request body buffer" });
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
      return res.status(401).json({ message: "Invalid signature" });
    }

    // We only care about issues events for now
    if (event === "issues") {
      const { action, issue, repository } = req.body;

      if (!repository?.full_name) {
        return res
          .status(400)
          .json({ message: "Repository full name is required in payload" });
      }

      // Resolve the tenant/organization linked to this repository webhook
      const integration = await GithubIntegration.findOne({
        repositoryFullName: repository.full_name,
      });

      if (!integration) {
        return res
          .status(404)
          .json({ message: "Integration not found for this repository" });
      }

      const orgId = integration.organization;

      if (action === "closed") {
        const issueNumber = issue.number;

        // Find action item by external GitHub issue ID scoped to organization
        const actionItem = await ActionItem.findOne({
          externalGitHubIssueId: issueNumber,
          organization: orgId,
        });

        if (actionItem) {
          actionItem.status = "completed";
          actionItem.resolvedAt = new Date();
          await actionItem.save();
          console.log(
            `ActionItem ${actionItem._id} completed via GitHub Webhook for organization ${orgId}.`,
          );
        }
      }

      // If issue reopened, sync it back to "open" or "in_progress"
      if (action === "reopened") {
        const issueNumber = issue.number;
        const actionItem = await ActionItem.findOne({
          externalGitHubIssueId: issueNumber,
          organization: orgId,
        });
        if (actionItem) {
          actionItem.status = "open";
          actionItem.resolvedAt = null;
          await actionItem.save();
          console.log(
            `ActionItem ${actionItem._id} reopened via GitHub Webhook for organization ${orgId}.`,
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
