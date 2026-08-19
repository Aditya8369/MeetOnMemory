import request from "supertest";
import mongoose from "mongoose";
import { app } from "../server.js";
import KeyMoment from "../models/keyMomentModel.js";
import Meeting from "../models/meetingModel.js";
import User from "../models/userModel.js";
import Organization from "../models/organizationModel.js";
import Membership from "../models/membershipModel.js";
import { createClerkTestToken } from "./helpers/clerkTestAuth.js";

let userOwner, userParticipant, userStranger;
let organization, meeting;
let ownerToken, participantToken, strangerToken;

beforeEach(async () => {
  await KeyMoment.deleteMany({});
  await Meeting.deleteMany({});
  await User.deleteMany({});
  await Organization.deleteMany({});

  organization = await Organization.create({
    name: "Test Org",
    slug: "test-org-keymoment",
    owner: new mongoose.Types.ObjectId(),
  });

  userOwner = await User.create({
    name: "Owner",
    email: "owner@test.com",
    password: "password123",
    organization: organization._id,
  });
  userOwner.clerkUserId = `test_${userOwner._id}`;
  await userOwner.save();
  ownerToken = createClerkTestToken({
    clerkUserId: userOwner.clerkUserId,
    email: userOwner.email,
  });

  userParticipant = await User.create({
    name: "Participant",
    email: "participant@test.com",
    password: "password123",
    organization: organization._id,
  });
  userParticipant.clerkUserId = `test_${userParticipant._id}`;
  await userParticipant.save();
  participantToken = createClerkTestToken({
    clerkUserId: userParticipant.clerkUserId,
    email: userParticipant.email,
  });

  userStranger = await User.create({
    name: "Stranger",
    email: "stranger@test.com",
    password: "password123",
    organization: organization._id,
  });
  userStranger.clerkUserId = `test_${userStranger._id}`;
  await userStranger.save();
  strangerToken = createClerkTestToken({
    clerkUserId: userStranger.clerkUserId,
    email: userStranger.email,
  });

  await Membership.create([
    {
      user: userOwner._id,
      organization: organization._id,
      role: "owner",
      status: "active",
    },
    {
      user: userParticipant._id,
      organization: organization._id,
      role: "member",
      status: "active",
    },
    {
      user: userStranger._id,
      organization: organization._id,
      role: "member",
      status: "active",
    },
  ]);

  meeting = await Meeting.create({
    title: "Test Meeting",
    date: new Date(),
    organization: organization._id,
    uploadedBy: userOwner._id,
    participants: [{ user: userParticipant._id, name: userParticipant.name }],
  });
});

describe("Key Moments API", () => {
  const mockValidMoment = {
    snippet: "This is a great idea",
    startTime: 10,
    endTime: 20,
    category: "insight",
    note: "Important insight",
  };

  describe("POST /api/key-moments", () => {
    it("should allow owner to create a key moment", async () => {
      const res = await request(app)
        .post("/api/key-moments")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ ...mockValidMoment, meetingId: meeting._id });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.keyMoment.category).toBe("insight");

      const count = await KeyMoment.countDocuments();
      expect(count).toBe(1);
    });

    it("should allow participant to create a key moment", async () => {
      const res = await request(app)
        .post("/api/key-moments")
        .set("Authorization", `Bearer ${participantToken}`)
        .send({ ...mockValidMoment, meetingId: meeting._id });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it("should reject creation if user is not owner or participant", async () => {
      const res = await request(app)
        .post("/api/key-moments")
        .set("Authorization", `Bearer ${strangerToken}`)
        .send({ ...mockValidMoment, meetingId: meeting._id });

      expect(res.status).toBe(403);
    });

    it("should validate category enum", async () => {
      const res = await request(app)
        .post("/api/key-moments")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          ...mockValidMoment,
          meetingId: meeting._id,
          category: "invalid_cat",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Validation error");
    });
  });

  describe("GET /api/key-moments/meeting/:meetingId", () => {
    beforeEach(async () => {
      await KeyMoment.create({
        ...mockValidMoment,
        meetingId: meeting._id,
        userId: userOwner._id,
        organization: organization._id,
      });
    });

    it("should allow owner to view moments", async () => {
      const res = await request(app)
        .get(`/api/key-moments/meeting/${meeting._id}`)
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.keyMoments.length).toBe(1);
    });

    it("should allow participant to view moments", async () => {
      const res = await request(app)
        .get(`/api/key-moments/meeting/${meeting._id}`)
        .set("Authorization", `Bearer ${participantToken}`);

      expect(res.status).toBe(200);
    });

    it("should forbid non-participants from viewing", async () => {
      const res = await request(app)
        .get(`/api/key-moments/meeting/${meeting._id}`)
        .set("Authorization", `Bearer ${strangerToken}`);

      expect(res.status).toBe(403);
    });
  });
});
