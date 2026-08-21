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

vi.mock("../services/adminJobsService.js", () => ({
  getAdminJobsDashboard: vi.fn(async () => ({
    redisConfigured: false,
    workers: [],
    shuttingDown: false,
    queues: [],
  })),
  retryFailedJob: vi.fn(async () => ({
    queueName: "data-export-queue",
    jobId: "1",
    state: "waiting",
  })),
  discardFailedJob: vi.fn(async () => ({
    queueName: "data-export-queue",
    jobId: "1",
    discarded: true,
  })),
}));

import adminJobsRoutes from "../routes/adminJobsRoutes.js";

describe("Admin jobs routes authz (Issue #2080)", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/api/admin/jobs", adminJobsRoutes);
  });

  afterAll(() => {
    vi.resetAllMocks();
  });

  it("denies unauthenticated access", async () => {
    const res = await request(app).get("/api/admin/jobs");
    expect(res.status).toBe(401);
  });

  it("denies members from viewing jobs", async () => {
    const res = await request(app)
      .get("/api/admin/jobs")
      .set("x-test-role", "member");
    expect(res.status).toBe(403);
  });

  it("allows admins to view jobs (read-only)", async () => {
    const res = await request(app)
      .get("/api/admin/jobs")
      .set("x-test-role", "admin");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("denies admins from retrying jobs", async () => {
    const res = await request(app)
      .post("/api/admin/jobs/data-export-queue/1/retry")
      .set("x-test-role", "admin");
    expect(res.status).toBe(403);
  });

  it("allows owners to retry jobs", async () => {
    const res = await request(app)
      .post("/api/admin/jobs/data-export-queue/1/retry")
      .set("x-test-role", "owner");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
