import { jest } from "@jest/globals";
import mongoose from "mongoose";
import request from "supertest";
import { app } from "../server.js";
import Meeting from "../models/meetingModel.js";
import Transcript from "../models/transcriptModel.js";
import SentimentTimeline from "../models/sentimentTimelineModel.js";
import Organization from "../models/organizationModel.js";
import User from "../models/userModel.js";
import {
  generateText,
  parseJsonOutput,
} from "../services/GenerativeAIService.js";

// Mock AI Service
jest.mock("../services/GenerativeAIService.js", () => ({
  generateText: jest.fn(),
  parseJsonOutput: jest.fn(),
}));

jest.mock("../middleware/userAuth.js", () => ({
  default: (req, res, next) => {
    req.user = { _id: new mongoose.Types.ObjectId() };
    next();
  },
}));

describe("Sentiment Timeline Feature", () => {
  let meeting;
  let organization;
  let user;

  beforeEach(async () => {
    await Meeting.deleteMany({});
    await Transcript.deleteMany({});
    await SentimentTimeline.deleteMany({});
    await Organization.deleteMany({});
    await User.deleteMany({});

    user = await User.create({
      name: "Test User",
      email: "test@example.com",
      clerkId: "clerk_123",
      password: "password123",
    });

    organization = await Organization.create({
      name: "Test Org",
      domain: "example.com",
      owner: user._id,
      slug: "test-org",
    });

    meeting = await Meeting.create({
      title: "Test Meeting",
      date: new Date(),
      uploadedBy: user._id,
      organization: organization._id,
      agendaItems: [{ text: "Introduction" }, { text: "Main Discussion" }],
    });

    await Transcript.create({
      meeting: meeting._id,
      status: "completed",
      segments: [
        { startTime: 0, endTime: 60000, text: "Hello everyone.", speaker: "A" },
        {
          startTime: 60000,
          endTime: 120000,
          text: "Let's start the meeting.",
          speaker: "B",
        },
        {
          startTime: 120000,
          endTime: 180000,
          text: "This is a great idea.",
          speaker: "A",
        },
        {
          startTime: 180000,
          endTime: 240000,
          text: "I disagree strongly.",
          speaker: "B",
        },
      ],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Just to be clean, wait for pending tasks if any.
    // Real connection teardown is handled by setup.js
    await SentimentTimeline.deleteMany({});
  });

  it("should generate a timeline successfully and save it", async () => {
    // Mock the AI response
    generateText.mockResolvedValueOnce(
      JSON.stringify({
        segments: [
          {
            startTime: 0,
            endTime: 120000,
            sentiment: "neutral",
            score: 0.1,
            textSnippet: "Hello everyone",
            agendaItemIndex: 0,
            agendaItemText: "Introduction",
          },
          {
            startTime: 120000,
            endTime: 240000,
            sentiment: "mixed",
            score: -0.2,
            textSnippet: "I disagree strongly",
            agendaItemIndex: 1,
            agendaItemText: "Main Discussion",
          },
        ],
        overallArc: "Started neutral, became contentious.",
      }),
    );

    parseJsonOutput.mockReturnValueOnce({
      segments: [
        {
          startTime: 0,
          endTime: 120000,
          sentiment: "neutral",
          score: 0.1,
          textSnippet: "Hello everyone",
          agendaItemIndex: 0,
          agendaItemText: "Introduction",
        },
        {
          startTime: 120000,
          endTime: 240000,
          sentiment: "negative",
          score: -0.2,
          textSnippet: "I disagree strongly",
          agendaItemIndex: 1,
          agendaItemText: "Main Discussion",
        },
      ],
      overallArc: "Started neutral, became contentious.",
    });

    const res = await request(app)
      .post(`/api/sentiment-timeline/${meeting._id}/generate`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.timeline).toBeDefined();
    expect(res.body.timeline.status).toBe("completed");
    expect(res.body.timeline.segments).toHaveLength(2);
    expect(res.body.timeline.segments[1].sentiment).toBe("negative");
    expect(res.body.timeline.segments[1].score).toBe(-0.2);

    // Verify it was saved in DB
    const dbTimeline = await SentimentTimeline.findOne({
      meeting: meeting._id,
    });
    expect(dbTimeline).not.toBeNull();
    expect(dbTimeline.segments).toHaveLength(2);
  });

  it("should retrieve an existing timeline", async () => {
    await SentimentTimeline.create({
      meeting: meeting._id,
      status: "completed",
      segments: [
        { startTime: 0, endTime: 120000, sentiment: "positive", score: 0.8 },
      ],
    });

    const res = await request(app)
      .get(`/api/sentiment-timeline/${meeting._id}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.timeline.segments[0].sentiment).toBe("positive");
  });

  it("should return 404 if no timeline exists when fetching", async () => {
    const res = await request(app)
      .get(`/api/sentiment-timeline/${meeting._id}`)
      .send();

    expect(res.status).toBe(404);
  });
});
