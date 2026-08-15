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
});
