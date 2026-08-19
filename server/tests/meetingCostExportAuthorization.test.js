/**
 * Issue #1540 — Meeting Cost CSV export must enforce authentication, RBAC,
 * and organization isolation before querying or generating cost data.
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

const { default: meetingCostRoutes } =
  await import("../routes/meetingCostRoutes.js");
const { default: Meeting } = await import("../models/meetingModel.js");
const meetingCostService = (await import("../services/meetingCostService.js"))
  .default;

await import("../models/userModel.js");
await import("../models/organizationModel.js");

const ORG_A = new mongoose.Types.ObjectId();
const ORG_B = new mongoose.Types.ObjectId();

const adminA = {
  _id: new mongoose.Types.ObjectId(),
  organization: ORG_A,
  role: "admin",
};

const ownerA = {
  _id: new mongoose.Types.ObjectId(),
  organization: ORG_A,
  role: "owner",
};

const memberA = {
  _id: new mongoose.Types.ObjectId(),
  organization: ORG_A,
  role: "member",
};

const moderatorA = {
  _id: new mongoose.Types.ObjectId(),
  organization: ORG_A,
  role: "moderator",
};

const adminB = {
  _id: new mongoose.Types.ObjectId(),
  organization: ORG_B,
  role: "admin",
};

const noOrgUser = {
  _id: new mongoose.Types.ObjectId(),
  organization: null,
  role: "admin",
};

let app;

beforeAll(async () => {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.TEST_MONGODB_URI);
  }

  app = express();
  app.use(express.json());
  app.use("/api/meeting-cost", meetingCostRoutes);
});

beforeEach(async () => {
  currentUser = adminA;
  await Meeting.deleteMany({
    organization: { $in: [ORG_A, ORG_B] },
  });
});

const seedCompletedMeeting = ({
  organization,
  uploadedBy,
  participants,
  title,
}) =>
  Meeting.create({
    uploadedBy,
    organization,
    title,
    date: new Date(),
    duration: 60,
    status: "completed",
    participants,
  });

describe("Meeting cost CSV export authorization (#1540)", () => {
  describe("GET /api/meeting-cost/analytics/export", () => {
    it("returns 401 when unauthenticated", async () => {
      currentUser = null;

      const res = await request(app).get("/api/meeting-cost/analytics/export");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("returns 403 when the authenticated user has no organization", async () => {
      currentUser = noOrgUser;

      const res = await request(app).get("/api/meeting-cost/analytics/export");

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/organization/i);
    });

    it("returns 403 for a member without analytics:export permission", async () => {
      currentUser = memberA;

      const res = await request(app).get("/api/meeting-cost/analytics/export");

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/permission/i);
    });

    it("returns 403 for a moderator without analytics:export permission", async () => {
      currentUser = moderatorA;

      const res = await request(app).get("/api/meeting-cost/analytics/export");

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/permission/i);
    });

    it("returns CSV for an admin with analytics:export permission", async () => {
      currentUser = adminA;

      await seedCompletedMeeting({
        organization: ORG_A,
        uploadedBy: adminA._id,
        title: "Org A Standup",
        participants: [{ name: "Alice Admin", email: "alice@org-a.test" }],
      });

      const res = await request(app).get("/api/meeting-cost/analytics/export");

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/text\/csv/);
      expect(res.text).toContain("alice@org-a.test");
    });

    it("returns CSV for an owner with analytics:export permission", async () => {
      currentUser = ownerA;

      await seedCompletedMeeting({
        organization: ORG_A,
        uploadedBy: ownerA._id,
        title: "Org A Planning",
        participants: [{ name: "Owner Alice", email: "owner@org-a.test" }],
      });

      const res = await request(app).get("/api/meeting-cost/analytics/export");

      expect(res.status).toBe(200);
      expect(res.text).toContain("owner@org-a.test");
    });

    it("scopes export to the authenticated organization despite client organizationId", async () => {
      currentUser = adminA;

      await seedCompletedMeeting({
        organization: ORG_A,
        uploadedBy: adminA._id,
        title: "Org A Meeting",
        participants: [{ name: "Alice", email: "alice@org-a.test" }],
      });
      await seedCompletedMeeting({
        organization: ORG_B,
        uploadedBy: adminB._id,
        title: "Org B Meeting",
        participants: [{ name: "Bob", email: "bob@org-b.test" }],
      });

      const res = await request(app)
        .get("/api/meeting-cost/analytics/export")
        .query({ organizationId: ORG_B.toString() });

      expect(res.status).toBe(200);
      expect(res.text).toContain("alice@org-a.test");
      expect(res.text).not.toContain("bob@org-b.test");
    });

    it("does not query foreign-organization data when client organizationId is spoofed", async () => {
      currentUser = adminA;
      const spy = jest.spyOn(meetingCostService, "getMemberTimeAnalytics");

      await request(app)
        .get("/api/meeting-cost/analytics/export")
        .query({ organizationId: ORG_B.toString() });

      expect(spy).toHaveBeenCalledWith(ORG_A.toString(), undefined, undefined);

      spy.mockRestore();
    });

    it("does not generate CSV before authorization succeeds", async () => {
      currentUser = memberA;
      const spy = jest.spyOn(meetingCostService, "getMemberTimeAnalytics");

      const res = await request(app).get("/api/meeting-cost/analytics/export");

      expect(res.status).toBe(403);
      expect(spy).not.toHaveBeenCalled();
      expect(res.headers["content-type"]).not.toMatch(/text\/csv/);

      spy.mockRestore();
    });
  });
});
