import request from "supertest";
import { app } from "../server.js";
import { createClerkTestToken, authHeader } from "./helpers/clerkTestAuth.js";
import User from "../models/userModel.js";
import Meeting from "../models/meetingModel.js";
import Policy from "../models/policyModel.js";
import mongoose from "mongoose";

describe("Analytics Routes Integration Tests", () => {
  let token;
  let user;
  let organizationId;

  beforeEach(async () => {
    organizationId = new mongoose.Types.ObjectId();
    user = await User.create({
      name: "Analytics Test User",
      email: "analytics_test@test.com",
      password: "password123",
      role: "member",
      organization: organizationId,
    });
    user.clerkUserId = `user_test_${user._id}`;
    await user.save();

    token = createClerkTestToken({
      clerkUserId: user.clerkUserId,
      email: user.email,
    });
  });

  describe("GET /api/analytics", () => {
    it("should return 401 Unauthorized if token is missing", async () => {
      const res = await request(app).get("/api/analytics");
      expect(res.statusCode).toBe(401);
    });

    it("should return correct summary and monthly trends for user's organization", async () => {
      // Create some meetings inside and outside organization
      await Meeting.create([
        {
          title: "Org Meeting 1",
          date: new Date(),
          organization: organizationId,
          uploadedBy: user._id,
          status: "completed",
          participants: [],
        },
        {
          title: "Org Meeting 2",
          date: new Date(),
          organization: organizationId,
          uploadedBy: user._id,
          status: "pending",
          participants: [],
        },
        {
          title: "External Meeting",
          date: new Date(),
          organization: new mongoose.Types.ObjectId(),
          uploadedBy: new mongoose.Types.ObjectId(),
          status: "completed",
          participants: [],
        },
      ]);

      // Create some policies inside and outside organization
      await Policy.create([
        {
          title: "Org Policy 1",
          organization: organizationId,
          uploadedBy: user._id,
          version: "1.0",
        },
        {
          title: "Org Policy 2",
          organization: organizationId,
          uploadedBy: user._id,
          version: "2.0", // updated policy
        },
      ]);

      const res = await request(app)
        .get("/api/analytics")
        .set(authHeader(token));

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.summary).toEqual(
        expect.objectContaining({
          totalMeetings: 2,
          completedMeetings: 1,
          totalPolicies: 2,
          updatedPolicies: 1,
        }),
      );
      expect(res.body.trends).toBeDefined();
      expect(res.body.trends.monthlyMeetings).toBeInstanceOf(Array);
      expect(res.body.trends.monthlyPolicies).toBeInstanceOf(Array);
    });
  });

  describe("GET /api/analytics/team/:teamId/summary (migrated from orphan)", () => {
    it("should return 401 without authentication", async () => {
      const res = await request(app).get(
        `/api/analytics/team/${organizationId}/summary`,
      );
      expect(res.statusCode).toBe(401);
    });

    it("should return org-scoped summary when teamId matches caller organization", async () => {
      await Meeting.create({
        title: "Analyzed Meeting",
        date: new Date(),
        organization: organizationId,
        uploadedBy: user._id,
        duration: 45,
        participants: [],
      });

      // Seed analytics via MeetingAnalytics model used by the canonical stack
      const MeetingAnalytics = (await import("../models/MeetingAnalytics.js"))
        .default;
      const meeting = await Meeting.findOne({ title: "Analyzed Meeting" });
      await MeetingAnalytics.create({
        meeting: meeting._id,
        organization: organizationId,
        engagementScore: 80,
        efficiencyScore: 70,
        duration: 45,
        participationBalanceScore: 0.2,
        status: "completed",
      });

      const res = await request(app)
        .get(`/api/analytics/team/${organizationId}/summary`)
        .set(authHeader(token));

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalMeetings).toBe(1);
      expect(res.body.data.avgEngagement).toBe(80);
    });

    it("should not return another organization's analytics via foreign teamId", async () => {
      const otherOrg = new mongoose.Types.ObjectId();
      const MeetingAnalytics = (await import("../models/MeetingAnalytics.js"))
        .default;
      const foreignMeeting = await Meeting.create({
        title: "Foreign Meeting",
        date: new Date(),
        organization: otherOrg,
        uploadedBy: new mongoose.Types.ObjectId(),
        participants: [],
      });
      await MeetingAnalytics.create({
        meeting: foreignMeeting._id,
        organization: otherOrg,
        engagementScore: 99,
        efficiencyScore: 99,
        duration: 30,
        status: "completed",
      });

      const res = await request(app)
        .get(`/api/analytics/team/${otherOrg}/summary`)
        .set(authHeader(token));

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      // Scoped to caller's org + foreign teamId filter → empty aggregate
      expect(res.body.data.totalMeetings || 0).toBe(0);
      expect(res.body.data.avgEngagement).toBeUndefined();
    });
  });

  describe("GET /api/analytics/meeting/:meetingId (singular alias)", () => {
    it("should reject unauthenticated access", async () => {
      const id = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/analytics/meeting/${id}`);
      expect(res.statusCode).toBe(401);
    });
  });
});
