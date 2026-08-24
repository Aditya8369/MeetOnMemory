import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import request from "supertest";
import express from "express";

vi.mock("../middleware/userAuth.js", () => ({
  default: (req, res, next) => {
    req.user = req.headers["x-test-role"]
      ? {
          _id: "u1",
          role: req.headers["x-test-role"],
          organization: "org1",
        }
      : null;
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    next();
  },
}));

vi.mock("../middleware/rateLimiter.js", () => ({
  apiLimiter: (_req, _res, next) => next(),
}));

vi.mock("../services/aiUsageMetricsService.js", () => ({
  getOrgAiUsageMetrics: vi.fn(async () => ({
    from: "2026-08-01",
    to: "2026-08-07",
    series: [],
    totals: {
      requests: 0,
      tokens: 0,
      errors: 0,
      estimatedCostUsd: 0,
    },
    budgetAlert: { enabled: false },
  })),
}));

import adminAiUsageRoutes from "../routes/adminAiUsageRoutes.js";

describe("Admin AI usage routes authz (Issue #2083)", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use("/api/admin/ai-usage", adminAiUsageRoutes);
  });

  afterAll(() => {
    vi.resetAllMocks();
  });

  it("denies unauthenticated access", async () => {
    const res = await request(app).get("/api/admin/ai-usage");
    expect(res.status).toBe(401);
  });

  it("denies members", async () => {
    const res = await request(app)
      .get("/api/admin/ai-usage")
      .set("x-test-role", "member");
    expect(res.status).toBe(403);
  });

  it("allows admins", async () => {
    const res = await request(app)
      .get("/api/admin/ai-usage")
      .set("x-test-role", "admin");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
