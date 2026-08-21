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
  writeLimiter: (_req, _res, next) => next(),
}));

vi.mock("../services/adminReindexService.js", () => ({
  listOrgEmbeddingStatus: vi.fn(async () => ({
    queue: "embedding-reindex-queue",
    meetings: [],
  })),
  getReindexJobStatus: vi.fn(async () => ({
    jobId: "j1",
    state: "completed",
  })),
  enqueueMeetingReindex: vi.fn(async () => ({
    jobId: "j1",
    status: "queued",
  })),
  enqueueOrgReindex: vi.fn(async () => ({
    jobId: "j2",
    status: "queued",
    meetingCount: 2,
  })),
}));

import adminReindexRoutes from "../routes/adminReindexRoutes.js";

describe("Admin embedding reindex routes authz (Issue #2084)", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/api/admin/embeddings", adminReindexRoutes);
  });

  afterAll(() => {
    vi.resetAllMocks();
  });

  it("denies unauthenticated access", async () => {
    const res = await request(app).get("/api/admin/embeddings");
    expect(res.status).toBe(401);
  });

  it("denies members", async () => {
    const res = await request(app)
      .get("/api/admin/embeddings")
      .set("x-test-role", "member");
    expect(res.status).toBe(403);
  });

  it("allows admins to list status", async () => {
    const res = await request(app)
      .get("/api/admin/embeddings")
      .set("x-test-role", "admin");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("allows owners to enqueue org reindex", async () => {
    const res = await request(app)
      .post("/api/admin/embeddings/reindex/org")
      .set("x-test-role", "owner");
    expect(res.status).toBe(202);
  });
});
