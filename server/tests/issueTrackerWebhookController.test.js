// server/tests/issueTrackerWebhookController.test.js
import express from "express";
import supertest from "supertest";
import crypto from "crypto";
import issueTrackerWebhookRoutes from "../routes/issueTrackerWebhookRoutes.js";

// Mock ActionItem model
jest.mock("../models/actionItemModel.js", () => ({
  findOne: jest.fn().mockResolvedValue({
    status: "open",
    save: jest.fn().mockResolvedValue(true),
  }),
}));

describe("Jira & Linear Webhook Signature Verification Tests (#1810)", () => {
  let app;
  const oldEnv = process.env;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/api/webhooks", issueTrackerWebhookRoutes);
  });

  beforeEach(() => {
    process.env = { ...oldEnv };
  });

  afterAll(() => {
    process.env = oldEnv;
  });

  it("POST /api/webhooks/linear should return 401 when LINEAR_WEBHOOK_SECRET is unconfigured", async () => {
    delete process.env.LINEAR_WEBHOOK_SECRET;

    const res = await supertest(app)
      .post("/api/webhooks/linear")
      .send({ action: "update", type: "Issue" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("not configured");
  });

  it("POST /api/webhooks/linear should return 401 for forged signature", async () => {
    process.env.LINEAR_WEBHOOK_SECRET = "secret_linear_key_123";

    const res = await supertest(app)
      .post("/api/webhooks/linear")
      .set("Linear-Signature", "forged_signature_hex")
      .send({ action: "update", type: "Issue" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("Invalid Linear signature");
  });

  it("POST /api/webhooks/linear should return 200 for valid HMAC signature", async () => {
    process.env.LINEAR_WEBHOOK_SECRET = "secret_linear_key_123";
    const payload = {
      action: "update",
      type: "Issue",
      data: { id: "LIN-10", state: { name: "Done" } },
    };
    const rawPayload = JSON.stringify(payload);
    const validSig = crypto
      .createHmac("sha256", process.env.LINEAR_WEBHOOK_SECRET)
      .update(rawPayload)
      .digest("hex");

    const res = await supertest(app)
      .post("/api/webhooks/linear")
      .set("Linear-Signature", validSig)
      .send(payload);

    expect(res.status).toBe(200);
  });

  it("POST /api/webhooks/jira should return 401 when JIRA_WEBHOOK_SECRET is unconfigured", async () => {
    delete process.env.JIRA_WEBHOOK_SECRET;

    const res = await supertest(app)
      .post("/api/webhooks/jira")
      .send({ issue: { key: "PROJ-1" } });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("not configured");
  });

  it("POST /api/webhooks/jira should return 200 for valid secret token header", async () => {
    process.env.JIRA_WEBHOOK_SECRET = "secret_jira_token_456";

    const res = await supertest(app)
      .post("/api/webhooks/jira")
      .set("Authorization", "Bearer secret_jira_token_456")
      .send({ issue: { key: "PROJ-1", fields: { status: { name: "Done" } } } });

    expect(res.status).toBe(200);
  });
});
