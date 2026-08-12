/**
 * Issue #1379 — meeting health endpoints must resolve the meeting and enforce
 * organization access before any health read/calculation. Cross-org callers
 * must not retrieve or trigger health computation for another tenant's meeting.
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

const mockCalculateMeetingHealth = jest.fn();

jest.unstable_mockModule("../services/meetingHealthService.js", () => ({
  calculateMeetingHealth: (...args) => mockCalculateMeetingHealth(...args),
}));

const { default: meetingHealthRoutes } =
  await import("../routes/meetingHealthRoutes.js");
const { default: Meeting } = await import("../models/meetingModel.js");
const { default: MeetingHealth } =
  await import("../models/meetingHealthModel.js");

await import("../models/userModel.js");
await import("../models/organizationModel.js");

const ORG_A = new mongoose.Types.ObjectId();
const ORG_B = new mongoose.Types.ObjectId();

const alice = {
  _id: new mongoose.Types.ObjectId(),
  organization: ORG_A,
  role: "member",
};

const aliceAdmin = {
  _id: new mongoose.Types.ObjectId(),
  organization: ORG_A,
  role: "admin",
};

const mallory = {
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

beforeAll(async () => {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.TEST_MONGODB_URI);
  }

  app = express();
  app.use(express.json());
  app.use("/api/meeting-health", meetingHealthRoutes);
});

beforeEach(() => {
  currentUser = alice;
  mockCalculateMeetingHealth.mockReset();
  mockCalculateMeetingHealth.mockResolvedValue({
    compositeScore: 80,
    factors: {
      agendaCoverage: 80,
      timeAdherence: 80,
      engagement: 80,
      actionItemClarity: 80,
      sentiment: 80,
    },
    recommendations: [],
  });
});

const seedMeeting = async ({
  organization,
  uploadedBy,
  title = "Health Meeting",
} = {}) => {
  return Meeting.create({
    uploadedBy,
    organization,
    title,
    date: new Date(),
  });
};

describe("Meeting health authorization (#1379)", () => {
  describe("GET /api/meeting-health/:meetingId", () => {
    it("allows a same-org member to read meeting health", async () => {
      const meeting = await seedMeeting({
        organization: ORG_A,
        uploadedBy: alice._id,
      });

      await MeetingHealth.create({
        meetingId: meeting._id,
        organization: ORG_A,
        compositeScore: 72,
        factors: {
          agendaCoverage: 70,
          timeAdherence: 70,
          engagement: 70,
          actionItemClarity: 70,
          sentiment: 80,
        },
        recommendations: [],
      });

      const res = await request(app).get(`/api/meeting-health/${meeting._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.compositeScore).toBe(72);
      expect(mockCalculateMeetingHealth).not.toHaveBeenCalled();
    });

    it("calculates health for authorized users when no cached record exists", async () => {
      const meeting = await seedMeeting({
        organization: ORG_A,
        uploadedBy: alice._id,
      });

      const res = await request(app).get(`/api/meeting-health/${meeting._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockCalculateMeetingHealth).toHaveBeenCalledWith(
        meeting._id.toString(),
      );
    });

    it("returns 403 for cross-organization access and never calculates health", async () => {
      const meeting = await seedMeeting({
        organization: ORG_B,
        uploadedBy: mallory._id,
        title: "Confidential",
      });

      currentUser = alice;
      const res = await request(app).get(`/api/meeting-health/${meeting._id}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/access/i);
      expect(mockCalculateMeetingHealth).not.toHaveBeenCalled();
    });

    it("returns 403 when the user has no organization", async () => {
      const meeting = await seedMeeting({
        organization: ORG_A,
        uploadedBy: alice._id,
      });

      currentUser = noOrgUser;
      const res = await request(app).get(`/api/meeting-health/${meeting._id}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/organization membership/i);
      expect(mockCalculateMeetingHealth).not.toHaveBeenCalled();
    });

    it("returns 404 for an unknown meeting", async () => {
      const missingId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/meeting-health/${missingId}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(mockCalculateMeetingHealth).not.toHaveBeenCalled();
    });

    it("returns 400 for an invalid meeting id", async () => {
      const res = await request(app).get("/api/meeting-health/not-a-valid-id");

      expect(res.status).toBe(400);
      expect(mockCalculateMeetingHealth).not.toHaveBeenCalled();
    });

    it("returns 401 when unauthenticated", async () => {
      const meeting = await seedMeeting({
        organization: ORG_A,
        uploadedBy: alice._id,
      });

      currentUser = null;
      const res = await request(app).get(`/api/meeting-health/${meeting._id}`);

      expect(res.status).toBe(401);
      expect(mockCalculateMeetingHealth).not.toHaveBeenCalled();
    });

    it("allows the meeting uploader even when org fields differ (ownership)", async () => {
      const meeting = await seedMeeting({
        organization: ORG_B,
        uploadedBy: alice._id,
      });

      currentUser = alice;
      const res = await request(app).get(`/api/meeting-health/${meeting._id}`);

      // canAccessMeetingDoc grants access to uploadedBy
      expect(res.status).toBe(200);
      expect(mockCalculateMeetingHealth).toHaveBeenCalled();
    });
  });

  describe("GET /api/meeting-health/trends/:organizationId", () => {
    it("allows an admin to read trends for their own organization", async () => {
      currentUser = aliceAdmin;

      const res = await request(app).get(`/api/meeting-health/trends/${ORG_A}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.trends).toEqual([]);
    });

    it("returns 403 when an admin requests another organization's trends", async () => {
      currentUser = aliceAdmin;

      const res = await request(app).get(`/api/meeting-health/trends/${ORG_B}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/access/i);
    });

    it("returns 403 for members without the admin/manager role", async () => {
      currentUser = alice;

      const res = await request(app).get(`/api/meeting-health/trends/${ORG_A}`);

      expect(res.status).toBe(403);
    });
  });
});
