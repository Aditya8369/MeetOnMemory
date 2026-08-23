import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import request from "supertest";
import express from "express";

vi.mock("../middleware/userAuth.js", () => ({
  default: (req, res, next) => {
    const role = req.headers["x-test-role"];
    if (!role) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    req.user = { _id: "u123", role, organization: "org123" };
    next();
  },
}));

vi.mock("../middleware/rateLimiter.js", () => ({
  apiLimiter: (_req, _res, next) => next(),
  writeLimiter: (_req, _res, next) => next(),
}));

vi.mock("../services/adminImportanceService.js", () => ({
  getOrgImportanceRecalculationStatus: vi.fn(async () => ({
    queue: "recalculate-importance-queue",
    redisActive: false,
    stats: { decisions: 5, actionItems: 10, totalMemories: 15 },
    lastRun: { status: "completed", lastJobId: null },
    activeJob: null,
  })),
  enqueueImportanceRecalculation: vi.fn(async () => ({
    queue: "recalculate-importance-queue",
    jobId: null,
    status: "completed",
    mode: "sync",
    results: { processedDecisions: 5, processedActionItems: 10 },
  })),
}));

import adminImportanceRoutes from "../routes/adminImportanceRoutes.js";

describe("Admin Importance Recalculation Routes", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/api/admin/importance", adminImportanceRoutes);
  });

  afterAll(() => {
    vi.resetAllMocks();
  });

  describe("GET /api/admin/importance/status", () => {
    it("should reject unauthenticated requests with 401", async () => {
      const res = await request(app).get("/api/admin/importance/status");
      expect(res.status).toBe(401);
    });

    it("should reject non-admin users with 403 Forbidden", async () => {
      const res = await request(app)
        .get("/api/admin/importance/status")
        .set("x-test-role", "member");
      expect(res.status).toBe(403);
    });

    it("should allow admin users to view status", async () => {
      const res = await request(app)
        .get("/api/admin/importance/status")
        .set("x-test-role", "admin");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.stats.decisions).toBe(5);
    });

    it("should allow owner users to view status", async () => {
      const res = await request(app)
        .get("/api/admin/importance/status")
        .set("x-test-role", "owner");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("POST /api/admin/importance/recalculate", () => {
    it("should reject unauthenticated requests with 401", async () => {
      const res = await request(app).post("/api/admin/importance/recalculate");
      expect(res.status).toBe(401);
    });

    it("should reject non-admin users with 403 Forbidden", async () => {
      const res = await request(app)
        .post("/api/admin/importance/recalculate")
        .set("x-test-role", "member");
      expect(res.status).toBe(403);
    });

    it("should allow admin to trigger recalculation", async () => {
      const res = await request(app)
        .post("/api/admin/importance/recalculate")
        .set("x-test-role", "admin");
      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.mode).toBe("sync");
    });
  });
});
