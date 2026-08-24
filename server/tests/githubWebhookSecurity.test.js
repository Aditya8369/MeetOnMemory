import request from "supertest";
import mongoose from "mongoose";
import crypto from "crypto";

const { default: express } = await import("express");
const { handleWebhook } =
  await import("../controllers/githubWebhookController.js");
const { default: ActionItem } = await import("../models/actionItemModel.js");
const { default: GithubIntegration } =
  await import("../models/githubIntegrationModel.js");
const { default: GitHubIssueSync } =
  await import("../models/githubIssueSyncModel.js");
const { default: WebhookDeliveryLog } =
  await import("../models/webhookDeliveryLogModel.js");

const app = express();

// Set up the same express.json body parser configuration as configured in express.js
app.use(
  express.json({
    limit: "2mb",
    verify: (req, _res, buf) => {
      if (buf && buf.length) {
        req.rawBody = buf;
      }
    },
  }),
);

app.post("/api/webhooks/github", handleWebhook);

describe("GitHub Webhook Security Integration Tests (#1809)", () => {
  const WEBHOOK_SECRET = "super-secret-key-123456";
  const ORG_A = new mongoose.Types.ObjectId();
  const ORG_B = new mongoose.Types.ObjectId();
  const MEETING_A_ID = new mongoose.Types.ObjectId();
  const MEETING_B_ID = new mongoose.Types.ObjectId();

  let originalSecret;

  beforeAll(() => {
    originalSecret = process.env.GITHUB_WEBHOOK_SECRET;
    process.env.GITHUB_WEBHOOK_SECRET = WEBHOOK_SECRET;
  });

  afterAll(() => {
    process.env.GITHUB_WEBHOOK_SECRET = originalSecret;
  });

  beforeEach(async () => {
    await ActionItem.deleteMany({});
    await GithubIntegration.deleteMany({});
    await GitHubIssueSync.deleteMany({});
    await WebhookDeliveryLog.deleteMany({});
  });

  const getSignature = (payload, secret = WEBHOOK_SECRET) => {
    const hmac = crypto.createHmac("sha256", secret);
    return "sha256=" + hmac.update(JSON.stringify(payload)).digest("hex");
  };

  it("rejects unsigned requests with 401", async () => {
    const payload = { event: "issues" };
    const res = await request(app)
      .post("/api/webhooks/github")
      .set("x-github-event", "issues")
      .send(payload);

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/signature is required/i);
  });

  it("rejects invalid signature requests with 401", async () => {
    const payload = { event: "issues" };
    const res = await request(app)
      .post("/api/webhooks/github")
      .set("x-github-event", "issues")
      .set("x-hub-signature-256", "sha256=invalid-signature-hash")
      .send(payload);

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid signature/i);
  });

  it("accepts valid signatures matching raw body payload with 200", async () => {
    const payload = {
      action: "closed",
      issue: { number: 42 },
      repository: { full_name: "test-owner/test-repo" },
    };

    // Pre-seed integration for test-owner/test-repo linked to ORG_A
    await GithubIntegration.create({
      organization: ORG_A,
      accessToken: "token-123",
      repositoryFullName: "test-owner/test-repo",
      connectedBy: new mongoose.Types.ObjectId(),
    });

    const signature = getSignature(payload);

    const res = await request(app)
      .post("/api/webhooks/github")
      .set("x-github-event", "issues")
      .set("x-hub-signature-256", signature)
      .send(payload);

    expect(res.status).toBe(200);
  });

  it("scopes issue closed updates to the matching tenant and prevents cross-tenant updates", async () => {
    // 1. Create two separate organization integrations
    await GithubIntegration.create({
      organization: ORG_A,
      accessToken: "token-a",
      repositoryFullName: "org-a/repo",
      connectedBy: new mongoose.Types.ObjectId(),
    });

    await GithubIntegration.create({
      organization: ORG_B,
      accessToken: "token-b",
      repositoryFullName: "org-b/repo",
      connectedBy: new mongoose.Types.ObjectId(),
    });

    // 2. Create action items for issue #1 in BOTH organizations
    const actionItemA = await ActionItem.create({
      text: "Action Item for Tenant A",
      sourceMeetingId: MEETING_A_ID,
      organization: ORG_A,
      status: "open",
    });

    const actionItemB = await ActionItem.create({
      text: "Action Item for Tenant B",
      sourceMeetingId: MEETING_B_ID,
      organization: ORG_B,
      status: "open",
    });

    // 3. Seed sync mapping mappings linking them to issue #1
    await GitHubIssueSync.create({
      organization: ORG_A,
      actionItem: actionItemA._id,
      repositoryFullName: "org-a/repo",
      githubIssueNumber: 1,
      githubIssueUrl: "https://github.com/org-a/repo/issues/1",
    });

    await GitHubIssueSync.create({
      organization: ORG_B,
      actionItem: actionItemB._id,
      repositoryFullName: "org-b/repo",
      githubIssueNumber: 1,
      githubIssueUrl: "https://github.com/org-b/repo/issues/1",
    });

    // 4. Receive closed issue #1 webhook for ORG_A's repository
    const payload = {
      action: "closed",
      issue: { number: 1 },
      repository: { full_name: "org-a/repo" },
    };
    const signature = getSignature(payload);

    const res = await request(app)
      .post("/api/webhooks/github")
      .set("x-github-event", "issues")
      .set("x-hub-signature-256", signature)
      .send(payload);

    expect(res.status).toBe(200);

    // 5. Verify ONLY Tenant A's action item is completed
    const updatedA = await ActionItem.findById(actionItemA._id);
    expect(updatedA.status).toBe("completed");
    expect(updatedA.resolvedAt).toBeDefined();

    // Verify Tenant B's action item is UNCHANGED (prevented cross-tenant updates)
    const updatedB = await ActionItem.findById(actionItemB._id);
    expect(updatedB.status).toBe("open");
    expect(updatedB.resolvedAt).toBeNull();
  });
});
