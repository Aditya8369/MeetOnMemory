import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import request from "supertest";
import express from "express";

vi.mock("../middleware/userAuth.js", () => ({
  default: (req, res, next) => {
    req.user = req.headers["x-test-role"]
      ? { _id: "u1", role: req.headers["x-test-role"] }
      : null;
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    next();
  },
}));

vi.mock("../middleware/rateLimiter.js", () => ({
  apiLimiter: (_req, _res, next) => next(),
  writeLimiter: (_req, _res, next) => next(),
}));

vi.mock("../services/adminHealthService.js", () => ({
  getAdminHealthReport: vi.fn(async () => ({
    success: true,
    overallStatus: "UP",
    timestamp: new Date().toISOString(),
    dependencies: {
      mongodb: { status: "up", required: true, detail: "connected" },
      redis: { status: "up", required: false, detail: "connected" },
      queues: {
        status: "operational",
        queuesCount: 12,
        activeWorkersCount: 12,
      },
    },
  })),
}));

import adminHealthRoutes from "../routes/adminHealthRoutes.js";

describe("Admin health routes authorization (Issue #2082)", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/api/admin/health", adminHealthRoutes);
  });

  afterAll(() => {
    vi.resetAllMocks();
  });

  it("denies unauthenticated access", async () => {
    const res = await request(app).get("/api/admin/health");
    expect(res.status).toBe(401);
  });

  it("denies non-admin members from viewing health report", async () => {
    const res = await request(app)
      .get("/api/admin/health")
      .set("x-test-role", "member");
    expect(res.status).toBe(403);
  });

  it("allows admins to view health report", async () => {
    const res = await request(app)
      .get("/api/admin/health")
      .set("x-test-role", "admin");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.overallStatus).toBe("UP");
  });

  it("allows owners to view health report", async () => {
    const res = await request(app)
      .get("/api/admin/health")
      .set("x-test-role", "owner");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
