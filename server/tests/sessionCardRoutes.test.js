import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";

// Mock nodemailer to prevent SMTP verification during tests
jest.mock("../config/nodeMailer.js", () => ({
  sendMail: jest.fn(),
  __esModule: true,
  default: { sendMail: jest.fn() },
}));

const mockGenerateSessionCardAI = jest.fn();
jest.unstable_mockModule("../services/GenerativeAIService.js", () => ({
  generateSessionCardAI: (...args) => mockGenerateSessionCardAI(...args),
}));

const { app } = await import("../server.js");
const { createClerkTestToken, authHeader } =
  await import("./helpers/clerkTestAuth.js");
const User = (await import("../models/userModel.js")).default;
const Organization = (await import("../models/organizationModel.js")).default;
const Membership = (await import("../models/membershipModel.js")).default;

describe("Session Card Generation and Media Upload API", () => {
  let user;
  let organization;
  let token;

  beforeEach(async () => {
    jest.clearAllMocks();

    organization = await Organization.create({
      name: "Session Org",
      slug: "session-org-" + Math.random().toString(36).substring(7),
      owner: new mongoose.Types.ObjectId(),
    });

    user = await User.create({
      name: "Session Test User",
      email: `session-${Math.random()}@example.com`,
      password: "password123",
      organization: organization._id,
      role: "admin",
    });
    user.clerkUserId = `user_test_${user._id}`;
    await user.save();

    await Membership.create({
      user: user._id,
      organization: organization._id,
      role: "admin",
      status: "active",
    });

    token = createClerkTestToken({
      clerkUserId: user.clerkUserId,
      email: user.email,
    });
  });

  describe("POST /api/sessions/generate", () => {
    it("should generate a session card and return the uploaded video file URL", async () => {
      mockGenerateSessionCardAI.mockResolvedValueOnce({
        summary: "This session discusses AI integration strategies.",
        keywords: ["AI", "Integration"],
      });

      const res = await request(app)
        .post("/api/sessions/generate")
        .set(authHeader(token))
        .field("eventName", "AI Tech Summit")
        .field("sessionTitle", "Building Agentic Apps")
        .field("speaker", "John Doe")
        .field("speakerTitle", "Lead Engineer")
        .field("speakerBio", "AI research veteran")
        .attach("slides", Buffer.from("dummy slide content 1"), "slides1.pdf")
        .attach("slides", Buffer.from("dummy slide content 2"), "slides2.pdf")
        .attach("video", Buffer.from("dummy video content"), "demo_video.mp4");

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.session).toEqual(
        expect.objectContaining({
          eventName: "AI Tech Summit",
          sessionTitle: "Building Agentic Apps",
          speaker: "John Doe",
          speakerTitle: "Lead Engineer",
          summary: "This session discusses AI integration strategies.",
          keywords: ["AI", "Integration"],
          videoUrl: expect.stringContaining("/uploads/sessions/"),
        }),
      );

      expect(mockGenerateSessionCardAI).toHaveBeenCalledWith(
        "AI Tech Summit",
        "Building Agentic Apps",
        "John Doe",
        "Lead Engineer",
        "AI research veteran",
      );
    });

    it("should reject access if user has no organization", async () => {
      const noOrgUser = await User.create({
        name: "No Org User",
        email: `noorg-${Math.random()}@example.com`,
        password: "password123",
      });
      noOrgUser.clerkUserId = `user_test_${noOrgUser._id}`;
      await noOrgUser.save();

      const noOrgToken = createClerkTestToken({
        clerkUserId: noOrgUser.clerkUserId,
        email: noOrgUser.email,
      });

      const res = await request(app)
        .post("/api/sessions/generate")
        .set(authHeader(noOrgToken))
        .field("sessionTitle", "Title");

      expect(res.statusCode).toBe(403);
    });

    it("should return 400 validation error if sessionTitle is missing", async () => {
      const res = await request(app)
        .post("/api/sessions/generate")
        .set(authHeader(token))
        .field("eventName", "Missing Title Event");

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
