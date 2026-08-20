/**
 * Issue #1380 — Meeting Health Trends must never query with a client-supplied
 * organizationId. Cross-org URL manipulation must not leak another tenant's
 * metrics.
 */

import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import mongoose from "mongoose";
import { requireOrganizationParamMatch } from "../middleware/rbac.js";

let currentUser = null;

jest.unstable_mockModule("../middleware/userAuth.js", () => ({
  default: (req, res, next) => {
    if (!currentUser) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    req.user = currentUser;
    next();
  },
}));

const findSpy = jest.fn();

jest.unstable_mockModule("../models/meetingHealthModel.js", () => ({
  default: {
    find: (...args) => findSpy(...args),
    findOne: jest.fn(),
  },
}));

const { default: meetingHealthRoutes } =
  await import("../routes/meetingHealthRoutes.js");

const ORG_A = new mongoose.Types.ObjectId();
const ORG_B = new mongoose.Types.ObjectId();

const aliceAdmin = {
  _id: new mongoose.Types.ObjectId(),
  organization: ORG_A,
  role: "admin",
};

const aliceManager = {
  _id: new mongoose.Types.ObjectId(),
  organization: ORG_A,
  role: "manager",
};

const aliceMember = {
  _id: new mongoose.Types.ObjectId(),
  organization: ORG_A,
  role: "member",
};

const malloryAdmin = {
  _id: new mongoose.Types.ObjectId(),
  organization: ORG_B,
  role: "admin",
};

const noOrgAdmin = {
  _id: new mongoose.Types.ObjectId(),
  organization: null,
  role: "admin",
};

let app;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use("/api/meeting-health", meetingHealthRoutes);
});

beforeEach(() => {
  currentUser = aliceAdmin;
  findSpy.mockReset();
  findSpy.mockReturnValue({
    sort: jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue([]),
      }),
    }),
  });
});

describe("requireOrganizationParamMatch (#1380)", () => {
  const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  it("sets authorizedOrganizationId from membership when path org matches", () => {
    const middleware = requireOrganizationParamMatch("organizationId");
    const req = {
      user: { organization: ORG_A, role: "admin" },
      params: { organizationId: ORG_A.toString() },
    };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.authorizedOrganizationId).toBe(ORG_A.toString());
    expect(res.status).not.toHaveBeenCalled();
  });

  it("rejects cross-organization path parameters", () => {
    const middleware = requireOrganizationParamMatch("organizationId");
    const req = {
      user: { organization: ORG_A, role: "admin" },
      params: { organizationId: ORG_B.toString() },
    };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(req.authorizedOrganizationId).toBeUndefined();
  });

  it("rejects missing organization membership", () => {
    const middleware = requireOrganizationParamMatch("organizationId");
    const req = {
      user: { organization: null, role: "admin" },
      params: { organizationId: ORG_A.toString() },
    };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("rejects invalid organization ids", () => {
    const middleware = requireOrganizationParamMatch("organizationId");
    const req = {
      user: { organization: ORG_A, role: "admin" },
      params: { organizationId: "not-valid" },
    };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe("GET /api/meeting-health/trends/:organizationId (#1380)", () => {
  it("allows admin access for their own organization", async () => {
    currentUser = aliceAdmin;

    const res = await request(app).get(`/api/meeting-health/trends/${ORG_A}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(findSpy).toHaveBeenCalledWith({
      organization: ORG_A.toString(),
    });
  });

  it("allows manager access for their own organization", async () => {
    currentUser = aliceManager;

    const res = await request(app).get(`/api/meeting-health/trends/${ORG_A}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(findSpy).toHaveBeenCalledWith({
      organization: ORG_A.toString(),
    });
  });

  it("denies cross-organization trend access and does not query foreign org", async () => {
    currentUser = aliceAdmin;

    const res = await request(app).get(`/api/meeting-health/trends/${ORG_B}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/access/i);
    expect(findSpy).not.toHaveBeenCalled();
  });

  it("denies members without admin/manager role", async () => {
    currentUser = aliceMember;

    const res = await request(app).get(`/api/meeting-health/trends/${ORG_A}`);

    expect(res.status).toBe(403);
    expect(findSpy).not.toHaveBeenCalled();
  });

  it("denies users with no organization membership", async () => {
    currentUser = noOrgAdmin;

    const res = await request(app).get(`/api/meeting-health/trends/${ORG_A}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/organization membership/i);
    expect(findSpy).not.toHaveBeenCalled();
  });

  it("rejects invalid organization ids", async () => {
    currentUser = aliceAdmin;

    const res = await request(app).get(
      "/api/meeting-health/trends/not-a-valid-id",
    );

    expect(res.status).toBe(400);
    expect(findSpy).not.toHaveBeenCalled();
  });

  it("returns 401 when unauthenticated", async () => {
    currentUser = null;

    const res = await request(app).get(`/api/meeting-health/trends/${ORG_A}`);

    expect(res.status).toBe(401);
    expect(findSpy).not.toHaveBeenCalled();
  });

  it("scopes queries to the authorized org even when path and membership match", async () => {
    currentUser = malloryAdmin;

    const foreignTrend = {
      organization: ORG_A,
      compositeScore: 99,
      factors: {
        agendaCoverage: 99,
        timeAdherence: 99,
        engagement: 99,
        actionItemClarity: 99,
        sentiment: 99,
      },
    };

    findSpy.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue([foreignTrend]),
        }),
      }),
    });

    // Mallory (ORG_B) must not be able to pull ORG_A trends via URL.
    const denied = await request(app).get(
      `/api/meeting-health/trends/${ORG_A}`,
    );
    expect(denied.status).toBe(403);
    expect(findSpy).not.toHaveBeenCalled();

    // Own-org request queries only ORG_B.
    findSpy.mockClear();
    findSpy.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue([]),
        }),
      }),
    });

    const allowed = await request(app).get(
      `/api/meeting-health/trends/${ORG_B}`,
    );
    expect(allowed.status).toBe(200);
    expect(findSpy).toHaveBeenCalledTimes(1);
    expect(findSpy).toHaveBeenCalledWith({
      organization: ORG_B.toString(),
    });
    expect(findSpy.mock.calls[0][0].organization).not.toBe(ORG_A.toString());
  });
});
