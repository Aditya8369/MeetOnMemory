/**
 * Issue #1381 — Recap schedule operations must never trust a client-supplied
 * organizationId. Cross-org URL manipulation must not create/read/update
 * another tenant's schedules.
 */

import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import mongoose from "mongoose";

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

const findOneAndUpdateSpy = jest.fn();
const findOneSpy = jest.fn();
const deliveryFindSpy = jest.fn();
const deliveryFindOneSpy = jest.fn();
const queueAddSpy = jest.fn();

jest.unstable_mockModule("../models/recapScheduleModel.js", () => ({
  default: {
    findOneAndUpdate: (...args) => findOneAndUpdateSpy(...args),
    findOne: (...args) => findOneSpy(...args),
  },
}));

jest.unstable_mockModule("../models/recapDeliveryModel.js", () => ({
  default: {
    find: (...args) => deliveryFindSpy(...args),
    findOne: (...args) => deliveryFindOneSpy(...args),
  },
}));

jest.unstable_mockModule("../services/queueService.js", () => ({
  recapDeliveryQueue: {
    isActive: true,
    add: (...args) => queueAddSpy(...args),
  },
}));

const { default: recapScheduleRoutes } =
  await import("../routes/recapScheduleRoutes.js");

const ORG_A = new mongoose.Types.ObjectId();
const ORG_B = new mongoose.Types.ObjectId();
const USER_A = new mongoose.Types.ObjectId();
const DELIVERY_ID = new mongoose.Types.ObjectId();

const aliceMember = {
  _id: USER_A,
  organization: ORG_A,
  role: "member",
};

const aliceAdmin = {
  _id: USER_A,
  organization: ORG_A,
  role: "admin",
};

const malloryAdmin = {
  _id: new mongoose.Types.ObjectId(),
  organization: ORG_B,
  role: "admin",
};

const noOrgUser = {
  _id: new mongoose.Types.ObjectId(),
  organization: null,
  role: "member",
};

let app;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use("/api/recap-schedule", recapScheduleRoutes);
});

beforeEach(() => {
  currentUser = aliceMember;
  findOneAndUpdateSpy.mockReset();
  findOneSpy.mockReset();
  deliveryFindSpy.mockReset();
  deliveryFindOneSpy.mockReset();
  queueAddSpy.mockReset();

  findOneAndUpdateSpy.mockResolvedValue({
    organizationId: ORG_A.toString(),
    userId: USER_A.toString(),
    scheduleType: "daily",
  });
  findOneSpy.mockResolvedValue({
    organizationId: ORG_A.toString(),
    userId: USER_A.toString(),
    scheduleType: "weekly",
  });
  deliveryFindSpy.mockReturnValue({
    populate: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue([
          {
            _id: DELIVERY_ID,
            meetingId: {
              _id: new mongoose.Types.ObjectId(),
              title: "Standup",
              organization: ORG_A,
            },
          },
        ]),
      }),
    }),
  });
  deliveryFindOneSpy.mockReturnValue({
    populate: jest.fn().mockResolvedValue({
      _id: DELIVERY_ID,
      meetingId: {
        _id: new mongoose.Types.ObjectId(),
        organization: ORG_A,
        title: "Standup",
      },
      userId: USER_A,
    }),
  });
});

describe("Recap schedule organization authorization (#1381)", () => {
  describe("GET /api/recap-schedule/:organizationId", () => {
    it("allows same-organization access and scopes the query", async () => {
      currentUser = aliceMember;

      const res = await request(app).get(`/api/recap-schedule/${ORG_A}`);

      expect(res.status).toBe(200);
      expect(findOneSpy).toHaveBeenCalledWith({
        organizationId: ORG_A.toString(),
        userId: USER_A,
      });
    });

    it("allows admin access for their own organization", async () => {
      currentUser = aliceAdmin;

      const res = await request(app).get(`/api/recap-schedule/${ORG_A}`);

      expect(res.status).toBe(200);
      expect(findOneSpy).toHaveBeenCalledWith({
        organizationId: ORG_A.toString(),
        userId: USER_A,
      });
    });

    it("denies cross-organization access and does not query", async () => {
      currentUser = aliceMember;

      const res = await request(app).get(`/api/recap-schedule/${ORG_B}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/access/i);
      expect(findOneSpy).not.toHaveBeenCalled();
    });

    it("denies users with no organization membership", async () => {
      currentUser = noOrgUser;

      const res = await request(app).get(`/api/recap-schedule/${ORG_A}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/organization membership/i);
      expect(findOneSpy).not.toHaveBeenCalled();
    });

    it("rejects invalid organization ids", async () => {
      currentUser = aliceMember;

      const res = await request(app).get("/api/recap-schedule/not-a-valid-id");

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid organization/i);
      expect(findOneSpy).not.toHaveBeenCalled();
    });

    it("returns 404 when schedule is missing in the authorized org", async () => {
      currentUser = aliceMember;
      findOneSpy.mockResolvedValue(null);

      const res = await request(app).get(`/api/recap-schedule/${ORG_A}`);

      expect(res.status).toBe(404);
      expect(findOneSpy).toHaveBeenCalledWith({
        organizationId: ORG_A.toString(),
        userId: USER_A,
      });
    });

    it("denies unauthenticated requests", async () => {
      currentUser = null;

      const res = await request(app).get(`/api/recap-schedule/${ORG_A}`);

      expect(res.status).toBe(401);
      expect(findOneSpy).not.toHaveBeenCalled();
    });
  });

  describe("PUT /api/recap-schedule/:organizationId (create/update)", () => {
    const payload = {
      scheduleType: "daily",
      deliveryChannel: "email",
      preferredTime: "10:00",
      timezone: "UTC",
    };

    it("creates/updates schedule for the authorized organization only", async () => {
      currentUser = aliceMember;

      const res = await request(app)
        .put(`/api/recap-schedule/${ORG_A}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(findOneAndUpdateSpy).toHaveBeenCalledWith(
        { organizationId: ORG_A.toString(), userId: USER_A },
        expect.objectContaining({
          organizationId: ORG_A.toString(),
          userId: USER_A,
          scheduleType: "daily",
        }),
        { new: true, upsert: true },
      );
    });

    it("denies cross-organization create/update and does not write", async () => {
      currentUser = aliceMember;

      const res = await request(app)
        .put(`/api/recap-schedule/${ORG_B}`)
        .send(payload);

      expect(res.status).toBe(403);
      expect(findOneAndUpdateSpy).not.toHaveBeenCalled();
    });

    it("denies foreign-org admin writing into another tenant", async () => {
      currentUser = malloryAdmin;

      const res = await request(app)
        .put(`/api/recap-schedule/${ORG_A}`)
        .send(payload);

      expect(res.status).toBe(403);
      expect(findOneAndUpdateSpy).not.toHaveBeenCalled();
    });

    it("rejects invalid organization ids before write", async () => {
      currentUser = aliceMember;

      const res = await request(app)
        .put("/api/recap-schedule/not-valid")
        .send(payload);

      expect(res.status).toBe(400);
      expect(findOneAndUpdateSpy).not.toHaveBeenCalled();
    });

    it("denies missing organization membership before write", async () => {
      currentUser = noOrgUser;

      const res = await request(app)
        .put(`/api/recap-schedule/${ORG_A}`)
        .send(payload);

      expect(res.status).toBe(403);
      expect(findOneAndUpdateSpy).not.toHaveBeenCalled();
    });

    it("denies unauthenticated create/update", async () => {
      currentUser = null;

      const res = await request(app)
        .put(`/api/recap-schedule/${ORG_A}`)
        .send(payload);

      expect(res.status).toBe(401);
      expect(findOneAndUpdateSpy).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/recap-schedule/history/deliveries (#1401)", () => {
    it("allows org members to list their delivery history", async () => {
      currentUser = aliceMember;

      const res = await request(app).get(
        "/api/recap-schedule/history/deliveries",
      );

      expect(res.status).toBe(200);
      expect(deliveryFindSpy).toHaveBeenCalledWith({ userId: USER_A });
      expect(res.body).toHaveLength(1);
      expect(res.body[0].meetingId.organization.toString()).toBe(
        ORG_A.toString(),
      );
    });

    it("scopes populate to the caller's organization (not client-supplied org)", async () => {
      currentUser = aliceMember;
      const populateSpy = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      });
      deliveryFindSpy.mockReturnValue({ populate: populateSpy });

      await request(app).get("/api/recap-schedule/history/deliveries");

      expect(populateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "meetingId",
          match: { organization: ORG_A.toString() },
        }),
      );
    });

    it("omits deliveries whose meeting is outside the caller's organization", async () => {
      currentUser = aliceMember;
      deliveryFindSpy.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([
              {
                _id: DELIVERY_ID,
                // populate match left meetingId null (foreign org)
                meetingId: null,
              },
              {
                _id: new mongoose.Types.ObjectId(),
                meetingId: {
                  title: "In-org",
                  organization: ORG_A,
                },
              },
            ]),
          }),
        }),
      });

      const res = await request(app).get(
        "/api/recap-schedule/history/deliveries",
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].meetingId.title).toBe("In-org");
    });

    it("denies users without organization membership", async () => {
      currentUser = noOrgUser;

      const res = await request(app).get(
        "/api/recap-schedule/history/deliveries",
      );

      expect(res.status).toBe(403);
      expect(deliveryFindSpy).not.toHaveBeenCalled();
    });

    it("denies unauthenticated list requests", async () => {
      currentUser = null;

      const res = await request(app).get(
        "/api/recap-schedule/history/deliveries",
      );

      expect(res.status).toBe(401);
      expect(deliveryFindSpy).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/recap-schedule/retry/:deliveryId", () => {
    it("allows org members to retry their own delivery", async () => {
      currentUser = aliceMember;

      const res = await request(app).post(
        `/api/recap-schedule/retry/${DELIVERY_ID}`,
      );

      expect(res.status).toBe(200);
      expect(deliveryFindOneSpy).toHaveBeenCalledWith({
        _id: DELIVERY_ID.toString(),
        userId: USER_A,
      });
      expect(queueAddSpy).toHaveBeenCalled();
    });

    it("denies retry when the linked meeting belongs to another organization", async () => {
      currentUser = aliceMember;
      deliveryFindOneSpy.mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          _id: DELIVERY_ID,
          meetingId: {
            _id: new mongoose.Types.ObjectId(),
            organization: ORG_B,
            title: "Foreign",
          },
          userId: USER_A,
        }),
      });

      const res = await request(app).post(
        `/api/recap-schedule/retry/${DELIVERY_ID}`,
      );

      expect(res.status).toBe(403);
      expect(queueAddSpy).not.toHaveBeenCalled();
    });

    it("denies users without organization membership", async () => {
      currentUser = noOrgUser;

      const res = await request(app).post(
        `/api/recap-schedule/retry/${DELIVERY_ID}`,
      );

      expect(res.status).toBe(403);
      expect(deliveryFindOneSpy).not.toHaveBeenCalled();
      expect(queueAddSpy).not.toHaveBeenCalled();
    });

    it("denies unauthenticated retry", async () => {
      currentUser = null;

      const res = await request(app).post(
        `/api/recap-schedule/retry/${DELIVERY_ID}`,
      );

      expect(res.status).toBe(401);
      expect(deliveryFindOneSpy).not.toHaveBeenCalled();
    });
  });

  describe("cross-tenant query scoping", () => {
    it("never queries with a foreign organizationId even when path differs from membership", async () => {
      currentUser = {
        _id: USER_A,
        organization: { _id: ORG_A },
        role: "member",
      };

      const res = await request(app).get(`/api/recap-schedule/${ORG_B}`);

      expect(res.status).toBe(403);
      expect(findOneSpy).not.toHaveBeenCalled();
      expect(findOneAndUpdateSpy).not.toHaveBeenCalled();
    });

    it("uses authorized membership org id (not raw path) on successful read", async () => {
      currentUser = {
        _id: USER_A,
        organization: { _id: ORG_A },
        role: "member",
      };

      await request(app).get(`/api/recap-schedule/${ORG_A}`);

      expect(findOneSpy).toHaveBeenCalledTimes(1);
      expect(findOneSpy.mock.calls[0][0].organizationId).toBe(ORG_A.toString());
      expect(findOneSpy.mock.calls[0][0].organizationId).not.toBe(
        ORG_B.toString(),
      );
    });
  });
});
