import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("openai", () => ({
  default: class OpenAI {},
}));

const TEST_USER = {
  _id: "507f1f77bcf86cd799439021",
  organization: "507f1f77bcf86cd799439011",
  role: "member",
};

// Stand in for Clerk. requireOrgMembership and requirePermission below are the
// real middleware — the point of this suite is that the guard chain still runs
// at the new prefix, so only the identity is faked.
vi.mock("../middleware/userAuth.js", () => ({
  default: (req, _res, next) => {
    req.user = { ...TEST_USER, ...(req.__user || {}) };
    next();
  },
}));

// The limiters this router uses are Redis-backed (#1452) and have nothing to do
// with routing. Partially mocked so the rest of the route table still imports
// the limiters it expects.
vi.mock("../middleware/rateLimiter.js", async (importOriginal) => ({
  ...(await importOriginal()),
  apiLimiter: (_req, _res, next) => next(),
  writeLimiter: (_req, _res, next) => next(),
}));

vi.mock("../models/policyComplianceModel.js", () => ({
  default: { find: vi.fn(), findOne: vi.fn() },
}));

vi.mock("../models/decisionModel.js", () => ({
  default: { findById: vi.fn() },
}));

vi.mock("../models/policyModel.js", () => ({
  default: { find: vi.fn(), findById: vi.fn() },
}));

import express from "express";
import request from "supertest";
import routes from "../routes/index.js";
import PolicyCompliance from "../models/policyComplianceModel.js";
import Decision from "../models/decisionModel.js";
import Policy from "../models/policyModel.js";

const ORG_A = TEST_USER.organization;
const ORG_B = "507f1f77bcf86cd799439012";
const DECISION_ID = "507f1f77bcf86cd799439031";
const POLICY_ID = "507f1f77bcf86cd799439032";
const FLAG_ID = "507f1f77bcf86cd799439033";

function countMatchingLayers(router, pathStr) {
  const stack = router.stack || [];
  return stack.filter(
    (layer) => typeof layer.match === "function" && layer.match(pathStr),
  ).length;
}

/**
 * Mongoose query stub: every chainable call returns itself, and awaiting it
 * resolves to `result`. Lets the controller keep its
 * .populate().populate().sort() chains untouched.
 */
const chain = (result) => {
  const q = {
    populate: vi.fn(() => q),
    sort: vi.fn(() => q),
    select: vi.fn(() => q),
    lean: vi.fn(() => q),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return q;
};

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

describe("Policy Compliance route prefix (#1562)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    PolicyCompliance.find.mockReturnValue(chain([]));
    PolicyCompliance.findOne.mockResolvedValue(null);
    Policy.find.mockReturnValue(chain([]));
    Policy.findById.mockReturnValue(chain(null));
    Decision.findById.mockReturnValue(chain(null));
  });

  describe("registration", () => {
    it("mounts the router at /api/policy-compliance", () => {
      expect(countMatchingLayers(routes, "/api/policy-compliance")).toBe(1);
    });

    it("no longer mounts it at the unreferenced /api/compliance", () => {
      expect(countMatchingLayers(routes, "/api/compliance")).toBe(0);
    });

    it("resolves each of the four paths policyComplianceApi.js calls", () => {
      for (const path of [
        "/api/policy-compliance/flags",
        `/api/policy-compliance/flags/${FLAG_ID}`,
        `/api/policy-compliance/decisions/${DECISION_ID}`,
        `/api/policy-compliance/policies/${POLICY_ID}/related-decisions`,
      ]) {
        expect(countMatchingLayers(routes, path)).toBeGreaterThan(0);
      }
    });
  });

  describe("the endpoints the dashboard calls now resolve", () => {
    it("serves GET /flags", async () => {
      PolicyCompliance.find.mockReturnValue(
        chain([{ _id: FLAG_ID, status: "unresolved" }]),
      );

      const res = await request(buildApp()).get(
        "/api/policy-compliance/flags?status=unresolved&classification=all",
      );

      expect(res.status).toBe(200);
      expect(PolicyCompliance.find).toHaveBeenCalledWith({
        organization: ORG_A,
        status: "unresolved",
      });
    });

    it("serves GET /decisions/:decisionId for an in-organization decision", async () => {
      Decision.findById.mockReturnValue(
        chain({
          _id: DECISION_ID,
          organization: ORG_A,
          text: "Ship on Friday",
          createdAt: new Date("2026-01-01"),
        }),
      );

      const res = await request(buildApp()).get(
        `/api/policy-compliance/decisions/${DECISION_ID}`,
      );

      expect(res.status).toBe(200);
    });

    it("serves GET /policies/:policyId/related-decisions", async () => {
      Policy.findById.mockReturnValue(
        chain({
          _id: POLICY_ID,
          organization: ORG_A,
          name: "Travel",
          version: 2,
        }),
      );

      const res = await request(buildApp()).get(
        `/api/policy-compliance/policies/${POLICY_ID}/related-decisions`,
      );

      expect(res.status).toBe(200);
    });

    it("serves PATCH /flags/:id", async () => {
      const save = vi.fn().mockResolvedValue(undefined);
      PolicyCompliance.findOne.mockResolvedValue({
        _id: FLAG_ID,
        status: "unresolved",
        save,
      });

      const res = await request(buildApp())
        .patch(`/api/policy-compliance/flags/${FLAG_ID}`)
        .send({ status: "acknowledged" });

      expect(res.status).toBe(200);
      expect(save).toHaveBeenCalled();
    });

    it("404s on the old prefix, confirming the move rather than a duplicate", async () => {
      const res = await request(buildApp()).get("/api/compliance/flags");

      expect(res.status).toBe(404);
      expect(PolicyCompliance.find).not.toHaveBeenCalled();
    });
  });

  describe("the guard chain still applies at the new prefix", () => {
    it("rejects a caller with no organization (requireOrgMembership)", async () => {
      const res = await request(buildApp({ organization: undefined })).get(
        "/api/policy-compliance/flags",
      );

      expect(res.status).toBe(403);
      expect(PolicyCompliance.find).not.toHaveBeenCalled();
    });

    it("rejects a caller with no role (requirePermission)", async () => {
      const res = await request(buildApp({ role: undefined })).get(
        "/api/policy-compliance/flags",
      );

      expect(res.status).toBe(403);
    });

    it("lets a viewer read flags but not update them", async () => {
      const readRes = await request(buildApp({ role: "viewer" })).get(
        "/api/policy-compliance/flags",
      );
      expect(readRes.status).toBe(200);

      const writeRes = await request(buildApp({ role: "viewer" }))
        .patch(`/api/policy-compliance/flags/${FLAG_ID}`)
        .send({ status: "dismissed" });
      expect(writeRes.status).toBe(403);
    });

    it("does not leak a decision belonging to another organization", async () => {
      Decision.findById.mockReturnValue(
        chain({
          _id: DECISION_ID,
          organization: ORG_B,
          text: "Other org decision",
          createdAt: new Date("2026-01-01"),
        }),
      );

      const res = await request(buildApp()).get(
        `/api/policy-compliance/decisions/${DECISION_ID}`,
      );

      expect(res.status).toBe(404);
    });

    it("does not leak a policy belonging to another organization", async () => {
      Policy.findById.mockReturnValue(
        chain({
          _id: POLICY_ID,
          organization: ORG_B,
          name: "Theirs",
          version: 1,
        }),
      );

      const res = await request(buildApp()).get(
        `/api/policy-compliance/policies/${POLICY_ID}/related-decisions`,
      );

      expect(res.status).toBe(404);
    });

    it("still rejects an out-of-whitelist status filter", async () => {
      const res = await request(buildApp()).get(
        "/api/policy-compliance/flags?status=__proto__",
      );

      expect(res.status).toBe(400);
      expect(PolicyCompliance.find).not.toHaveBeenCalled();
    });

    it("still rejects a malformed flag id on update", async () => {
      const res = await request(buildApp())
        .patch("/api/policy-compliance/flags/not-an-id")
        .send({ status: "acknowledged" });

      expect(res.status).toBe(400);
    });
  });
});
