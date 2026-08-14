import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("openai", () => ({
  default: class OpenAI {},
}));

const TEST_USER = {
  _id: "507f1f77bcf86cd799439021",
  organization: "507f1f77bcf86cd799439011",
  role: "member",
};

// Stand in for Clerk so the router's own guard chain still runs, but with a
// known identity. Everything below the auth layer is exercised for real.
vi.mock("../middleware/userAuth.js", () => ({
  default: (req, _res, next) => {
    req.user = { ...TEST_USER, ...(req.__user || {}) };
    next();
  },
}));

vi.mock("../services/meetingQualityService.js", () => ({
  calculateMeetingQuality: vi.fn(),
  getMeetingQuality: vi.fn(),
  getOrganizationQuality: vi.fn(),
  getQualityTrends: vi.fn(),
  getLeaderboard: vi.fn(),
  exportQualityReport: vi.fn(),
}));

vi.mock("../services/recommendationEngine.js", () => ({
  generateUserRecommendations: vi.fn(),
  getBestPractices: vi.fn(),
}));

import express from "express";
import request from "supertest";
import routes from "../routes/index.js";
import {
  getOrganizationQuality,
  getQualityTrends,
  getLeaderboard,
} from "../services/meetingQualityService.js";
import { generateUserRecommendations } from "../services/recommendationEngine.js";

const ORG_A = TEST_USER.organization;
const ORG_B = "507f1f77bcf86cd799439012";

function countMatchingLayers(router, pathStr) {
  const stack = router.stack || [];
  return stack.filter(
    (layer) => typeof layer.match === "function" && layer.match(pathStr),
  ).length;
}

/**
 * Mounts the real router table. `overrideUser` lets a single test act as a
 * different principal without re-mocking the auth middleware.
 */
const buildApp = (overrideUser) => {
  const app = express();
  app.use(express.json());
  if (overrideUser) {
    app.use((req, _res, next) => {
      req.__user = overrideUser;
      next();
    });
  }
  app.use(routes);
  return app;
};

describe("Meeting Quality route prefix (#1561)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getOrganizationQuality.mockResolvedValue({ score: 85 });
    getQualityTrends.mockResolvedValue({ trend: [] });
    getLeaderboard.mockResolvedValue({ entries: [] });
    generateUserRecommendations.mockResolvedValue({ recommendations: [] });
  });

  describe("registration", () => {
    it("mounts the router at /api/quality", () => {
      expect(countMatchingLayers(routes, "/api/quality")).toBe(1);
    });

    it("no longer mounts it at the unreferenced /api/meeting-quality", () => {
      expect(countMatchingLayers(routes, "/api/meeting-quality")).toBe(0);
    });

    it("registers the prefix exactly once", () => {
      expect(countMatchingLayers(routes, "/api/quality")).toBe(1);
    });
  });

  describe("the endpoints MeetingQuality.jsx calls now resolve", () => {
    it("serves GET /api/quality/organization/:orgId", async () => {
      const res = await request(buildApp()).get(
        `/api/quality/organization/${ORG_A}`,
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ score: 85 });
      expect(getOrganizationQuality).toHaveBeenCalledWith(ORG_A, "monthly");
    });

    it("serves GET /api/quality/recommendations/:userId for the caller", async () => {
      const res = await request(buildApp()).get(
        `/api/quality/recommendations/${TEST_USER._id}`,
      );

      expect(res.status).toBe(200);
      expect(generateUserRecommendations).toHaveBeenCalled();
    });

    it("serves GET /api/quality/trends/:orgId", async () => {
      const res = await request(buildApp()).get(`/api/quality/trends/${ORG_A}`);

      expect(res.status).toBe(200);
    });

    it("serves GET /api/quality/leaderboard/:orgId", async () => {
      const res = await request(buildApp()).get(
        `/api/quality/leaderboard/${ORG_A}`,
      );

      expect(res.status).toBe(200);
    });

    it("404s on the old prefix, confirming the move rather than a duplicate", async () => {
      const res = await request(buildApp()).get(
        `/api/meeting-quality/organization/${ORG_A}`,
      );

      expect(res.status).toBe(404);
      expect(getOrganizationQuality).not.toHaveBeenCalled();
    });
  });

  describe("authorization is unchanged by the move", () => {
    it("rejects another organization's quality metrics", async () => {
      const res = await request(buildApp()).get(
        `/api/quality/organization/${ORG_B}`,
      );

      expect(res.status).toBe(403);
      expect(getOrganizationQuality).not.toHaveBeenCalled();
    });

    it("rejects another organization's trends", async () => {
      const res = await request(buildApp()).get(`/api/quality/trends/${ORG_B}`);

      expect(res.status).toBe(403);
      expect(getQualityTrends).not.toHaveBeenCalled();
    });

    it("rejects another organization's leaderboard", async () => {
      const res = await request(buildApp()).get(
        `/api/quality/leaderboard/${ORG_B}`,
      );

      expect(res.status).toBe(403);
      expect(getLeaderboard).not.toHaveBeenCalled();
    });

    it("rejects a malformed organization id with 400", async () => {
      const res = await request(buildApp()).get(
        "/api/quality/organization/not-an-id",
      );

      expect(res.status).toBe(400);
    });

    it("stops a member reading another user's recommendations", async () => {
      const res = await request(buildApp()).get(
        "/api/quality/recommendations/507f1f77bcf86cd799439099",
      );

      expect(res.status).toBe(403);
      expect(generateUserRecommendations).not.toHaveBeenCalled();
    });

    it("still allows an admin to read another user's recommendations", async () => {
      const app = buildApp({ role: "admin" });

      const res = await request(app).get(
        "/api/quality/recommendations/507f1f77bcf86cd799439099",
      );

      expect(res.status).toBe(200);
      expect(generateUserRecommendations).toHaveBeenCalled();
    });
  });
});
