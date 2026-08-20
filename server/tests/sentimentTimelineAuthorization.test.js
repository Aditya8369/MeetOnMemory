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

const mockGenerateTimeline = jest.fn().mockResolvedValue({
  meeting: new mongoose.Types.ObjectId(),
  status: "completed",
  segments: [
    { startTime: 0, endTime: 120000, sentiment: "positive", score: 0.8 },
  ],
});

jest.unstable_mockModule("../services/sentimentTimelineService.js", () => ({
  generateSentimentTimeline: mockGenerateTimeline,
}));

const { default: sentimentTimelineRoutes } =
  await import("../routes/sentimentTimelineRoutes.js");
const { default: Meeting } = await import("../models/meetingModel.js");
const { default: SentimentTimeline } =
  await import("../models/sentimentTimelineModel.js");

const ORG_A = new mongoose.Types.ObjectId();
const ORG_B = new mongoose.Types.ObjectId();

const aliceMember = {
  _id: new mongoose.Types.ObjectId(),
  organization: ORG_A,
  role: "member",
};

const aliceViewer = {
  _id: new mongoose.Types.ObjectId(),
  organization: ORG_A,
  role: "viewer",
};

const malloryOtherOrg = {
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
  app.use("/api/sentiment-timeline", sentimentTimelineRoutes);
});

beforeEach(() => {
  currentUser = aliceMember;
  mockGenerateTimeline.mockClear();
});

afterEach(async () => {
  await Meeting.deleteMany({});
  await SentimentTimeline.deleteMany({});
});

const seedMeeting = async ({
  organization = ORG_A,
  uploadedBy = aliceMember._id,
  title = "Sentiment Meeting",
} = {}) => {
  return Meeting.create({
    uploadedBy,
    organization,
    title,
    date: new Date(),
  });
};

const seedTimeline = async ({ meeting, organization = ORG_A } = {}) => {
  return SentimentTimeline.create({
    meeting: meeting._id,
    organization,
    status: "completed",
    segments: [
      { startTime: 0, endTime: 60000, sentiment: "positive", score: 0.7 },
    ],
  });
};

describe("Sentiment timeline authorization (#1535)", () => {
  describe("Authentication & Org Membership Guards", () => {
    it("returns 401 when request is unauthenticated", async () => {
      currentUser = null;
      const res = await request(app).get(
        `/api/sentiment-timeline/${new mongoose.Types.ObjectId()}`,
      );
      expect(res.status).toBe(401);
    });

    it("returns 403 when user has no organization membership", async () => {
      currentUser = noOrgUser;
      const res = await request(app).get(
        `/api/sentiment-timeline/${new mongoose.Types.ObjectId()}`,
      );
      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/sentiment-timeline/:meetingId", () => {
    it("allows authorized viewer to fetch sentiment timeline for same-org meeting", async () => {
      currentUser = aliceViewer;
      const meeting = await seedMeeting({ organization: ORG_A });
      await seedTimeline({ meeting, organization: ORG_A });

      const res = await request(app).get(
        `/api/sentiment-timeline/${meeting._id}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.timeline.segments).toHaveLength(1);
    });

    it("rejects cross-organization access to sentiment timeline", async () => {
      currentUser = malloryOtherOrg;
      const meeting = await seedMeeting({ organization: ORG_A });
      await seedTimeline({ meeting, organization: ORG_A });

      const res = await request(app).get(
        `/api/sentiment-timeline/${meeting._id}`,
      );

      expect(res.status).toBe(403);
    });

    it("rejects invalid meeting ID format", async () => {
      const res = await request(app).get(
        "/api/sentiment-timeline/invalid-id-format",
      );
      expect(res.status).toBe(400);
    });

    it("returns 404 when meeting does not exist", async () => {
      const res = await request(app).get(
        `/api/sentiment-timeline/${new mongoose.Types.ObjectId()}`,
      );
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/sentiment-timeline/:meetingId/generate", () => {
    it("allows authorized member with edit permissions to generate timeline", async () => {
      const meeting = await seedMeeting({ organization: ORG_A });

      const res = await request(app).post(
        `/api/sentiment-timeline/${meeting._id}/generate`,
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockGenerateTimeline).toHaveBeenCalledWith(meeting._id.toString());
    });

    it("rejects timeline generation when viewer lacks edit permission", async () => {
      currentUser = aliceViewer;
      const meeting = await seedMeeting({ organization: ORG_A });

      const res = await request(app).post(
        `/api/sentiment-timeline/${meeting._id}/generate`,
      );

      expect(res.status).toBe(403);
      expect(mockGenerateTimeline).not.toHaveBeenCalled();
    });

    it("rejects cross-organization attempt to generate sentiment timeline", async () => {
      currentUser = malloryOtherOrg;
      const meeting = await seedMeeting({ organization: ORG_A });

      const res = await request(app).post(
        `/api/sentiment-timeline/${meeting._id}/generate`,
      );

      expect(res.status).toBe(403);
      expect(mockGenerateTimeline).not.toHaveBeenCalled();
    });
  });
});
