import mongoose from "mongoose";
import request from "supertest";
import Meeting from "../models/meetingModel.js";
import MeetingGoal from "../models/meetingGoalModel.js";
import User from "../models/userModel.js";
import Organization from "../models/organizationModel.js";
import jwt from "jsonwebtoken";

import { jest } from "@jest/globals";

jest.unstable_mockModule("../middleware/userAuth.js", () => {
  return {
    default: async (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        try {
          const jwt = await import("jsonwebtoken");
          const decoded = jwt.default.verify(token, process.env.JWT_SECRET);

          req.user = {
            _id: decoded.id,
            id: decoded.id,
            role: decoded.role,
            activeOrganization: decoded.organization,
          };
          return next();
        } catch (_err) {
          return res
            .status(401)
            .json({ success: false, message: "Unauthorized" });
        }
      }
      return res.status(401).json({ success: false, message: "No token" });
    },
  };
});

const { app } = await import("../server.js");

process.env.CLERK_TEST_AUTH = "jwt";
process.env.JWT_SECRET = "testsecret";

describe("Meeting Goal API", () => {
  let user;
  let otherUser;
  let organization;
  let meeting;
  let token;
  let otherToken;

  beforeEach(async () => {
    await MeetingGoal.deleteMany({});
    await Meeting.deleteMany({});
    await User.deleteMany({});
    await Organization.deleteMany({});

    const userId = new mongoose.Types.ObjectId();
    const orgId = new mongoose.Types.ObjectId();

    organization = await Organization.create({
      _id: orgId,
      name: "Test Org",
      slug: "test-org-" + Date.now(),
      owner: userId,
    });

    user = await User.create({
      _id: userId,
      name: "Test User",
      email: "test@example.com",
      password: "password",
      organization: organization._id,
      activeOrganization: organization._id,
    });

    otherUser = await User.create({
      name: "Other User",
      email: "other@example.com",
      password: "password",
      organization: organization._id,
      activeOrganization: organization._id,
    });

    token = jwt.sign(
      { id: user._id, role: "user", organization: organization._id },
      process.env.JWT_SECRET,
    );
    otherToken = jwt.sign(
      { id: otherUser._id, role: "user", organization: organization._id },
      process.env.JWT_SECRET,
    );

    meeting = await Meeting.create({
      title: "Test Meeting",
      uploadedBy: user._id,
      organization: organization._id,
      date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    });
  });

  it("should allow the owner to set goals", async () => {
    const res = await request(app)
      .post(`/api/meeting-goals/meeting/${meeting._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        goals: [{ text: "Discuss budget" }, { text: "Assign roles" }],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.meetingGoal.goals.length).toBe(2);
    expect(res.body.meetingGoal.goals[0].status).toBe("pending");
  });

  it("should not allow more than 5 goals", async () => {
    const res = await request(app)
      .post(`/api/meeting-goals/meeting/${meeting._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        goals: [
          { text: "1" },
          { text: "2" },
          { text: "3" },
          { text: "4" },
          { text: "5" },
          { text: "6" },
        ],
      });

    expect(res.status).toBe(400);
  });

  it("should not allow non-owners to set goals", async () => {
    const res = await request(app)
      .post(`/api/meeting-goals/meeting/${meeting._id}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({
        goals: [{ text: "Sneaky goal" }],
      });

    expect(res.status).toBe(403);
  });

  it("should not allow updating goal status before the meeting", async () => {
    await request(app)
      .post(`/api/meeting-goals/meeting/${meeting._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ goals: [{ text: "Discuss budget" }] });

    const mg = await MeetingGoal.findOne({ meetingId: meeting._id });
    const goalId = mg.goals[0]._id;

    const res = await request(app)
      .patch(`/api/meeting-goals/meeting/${meeting._id}/goal/${goalId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "achieved" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/before the meeting occurs/i);
  });

  it("should allow updating goal status after the meeting", async () => {
    // Set meeting date to past
    meeting.date = new Date(Date.now() - 86400000).toISOString();
    await meeting.save();

    await request(app)
      .post(`/api/meeting-goals/meeting/${meeting._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ goals: [{ text: "Discuss budget" }] });

    const mg = await MeetingGoal.findOne({ meetingId: meeting._id });
    const goalId = mg.goals[0]._id;

    const res = await request(app)
      .patch(`/api/meeting-goals/meeting/${meeting._id}/goal/${goalId}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ status: "achieved", outcomeNote: "Budget approved" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = await MeetingGoal.findById(mg._id);
    expect(updated.goals[0].status).toBe("achieved");
    expect(updated.goals[0].outcomeNote).toBe("Budget approved");
  });

  it("should calculate correct aggregate org stats", async () => {
    meeting.date = new Date(Date.now() - 86400000).toISOString();
    await meeting.save();

    await MeetingGoal.create({
      meetingId: meeting._id,
      organization: organization._id,
      createdBy: user._id,
      goals: [
        { text: "G1", status: "achieved" },
        { text: "G2", status: "partially_achieved" },
        { text: "G3", status: "not_achieved" },
      ],
    });

    const res = await request(app)
      .get(`/api/meeting-goals/org/${organization._id}/stats`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stats.length).toBeGreaterThan(0);

    // G1 (1) + G2 (0.5) / 3 = 1.5/3 = 50%
    expect(res.body.stats[0].achievementRate).toBe(50);
  });

  describe("Multi-tenant Organization Isolation", () => {
    let otherOrgId;
    let otherOrgMeeting;

    beforeEach(async () => {
      otherOrgId = new mongoose.Types.ObjectId();
      await Organization.create({
        _id: otherOrgId,
        name: "Other Org",
        slug: "other-org-" + Date.now(),
        owner: new mongoose.Types.ObjectId(),
      });

      otherOrgMeeting = await Meeting.create({
        title: "Other Org Meeting",
        uploadedBy: new mongoose.Types.ObjectId(),
        organization: otherOrgId,
        date: new Date(Date.now() + 86400000).toISOString(),
      });
    });

    it("should prevent setting goals for a meeting in another organization", async () => {
      const res = await request(app)
        .post(`/api/meeting-goals/meeting/${otherOrgMeeting._id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          goals: [{ text: "Cross-org goal setting" }],
        });

      expect(res.status).toBe(404);
    });

    it("should prevent retrieving goals for a meeting in another organization", async () => {
      await MeetingGoal.create({
        meetingId: otherOrgMeeting._id,
        organization: otherOrgId,
        createdBy: new mongoose.Types.ObjectId(),
        goals: [{ text: "Secret goal", status: "pending" }],
      });

      const res = await request(app)
        .get(`/api/meeting-goals/meeting/${otherOrgMeeting._id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it("should prevent updating goal status for a meeting in another organization", async () => {
      otherOrgMeeting.date = new Date(Date.now() - 86400000).toISOString();
      await otherOrgMeeting.save();

      const otherOrgGoal = await MeetingGoal.create({
        meetingId: otherOrgMeeting._id,
        organization: otherOrgId,
        createdBy: new mongoose.Types.ObjectId(),
        goals: [{ text: "Secret goal", status: "pending" }],
      });
      const goalId = otherOrgGoal.goals[0]._id;

      const res = await request(app)
        .patch(
          `/api/meeting-goals/meeting/${otherOrgMeeting._id}/goal/${goalId}`,
        )
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "achieved" });

      expect(res.status).toBe(404);
    });

    it("should prevent fetching statistics of another organization", async () => {
      const res = await request(app)
        .get(`/api/meeting-goals/org/${otherOrgId}/stats`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });
});
