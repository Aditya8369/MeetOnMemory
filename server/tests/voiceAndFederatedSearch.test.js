import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

vi.mock("../middleware/userAuth.js", () => ({
  default: (req, res, next) => {
    req.user = {
      _id: "user-123",
      role: "member",
      organization: "org-123",
    };
    next();
  },
}));

vi.mock("../middleware/rbac.js", () => ({
  requirePermission: () => (req, res, next) => next(),
  requireOrgMembership: (req, res, next) => next(),
}));

vi.mock("../middleware/cacheMiddleware.js", () => ({
  cacheSearch: (req, res, next) => next(),
}));

vi.mock("../middleware/rateLimiter.js", () => ({
  apiLimiter: (req, res, next) => next(),
}));

vi.mock("../services/federatedSearchService.js", () => ({
  federatedRetrieve: vi.fn().mockResolvedValue({
    results: [
      {
        _id: "meet-1",
        title: "Cross-Org Alignment",
        organizationName: "Org A",
        score: 0.89,
      },
    ],
    meta: { totalWorkspaces: 2, totalResults: 1 },
  }),
}));

vi.mock("../controllers/transcriptController.js", () => ({
  voiceSearch: vi.fn().mockImplementation((req, res) => {
    const q = req.query.query;
    res.status(200).json({
      success: true,
      results: [
        {
          _id: "m-voice-1",
          title: `Voice match for ${q}`,
          summary: "Voice query test result",
          score: 0.92,
        },
      ],
    });
  }),
}));

import searchRoutes from "../routes/searchRoutes.js";

describe("Voice and Federated Search Routes API (#2010)", () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/api/search", searchRoutes);
  });

  it("GET /api/search/voice returns voice search results", async () => {
    const res = await request(app).get(
      "/api/search/voice?query=budget%20planning",
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.results[0].title).toBe("Voice match for budget planning");
  });

  it("POST /api/search/federated returns federated cross-workspace results", async () => {
    const res = await request(app)
      .post("/api/search/federated")
      .send({ query: "quarterly goals", organizationIds: ["org-1", "org-2"] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const results = res.body.results || res.body.data?.results;
    expect(results[0].organizationName).toBe("Org A");
  });
});
