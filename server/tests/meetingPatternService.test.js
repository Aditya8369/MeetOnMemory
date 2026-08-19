import mongoose from "mongoose";
import { jest } from "@jest/globals";
import MeetingPattern from "../models/meetingPatternModel.js";
import Meeting from "../models/meetingModel.js";
import ActionItem from "../models/actionItemModel.js";
import Organization from "../models/organizationModel.js";
import meetingPatternService from "../services/meetingPatternService.js";

// Mock the AI service
jest.mock("../services/GenerativeAIService.js", () => ({
  generateText: jest.fn().mockResolvedValue("Mock AI Recommendation"),
}));

describe("meetingPatternService", () => {
  let orgId;

  beforeAll(async () => {
    // Setup test database connection
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://127.0.0.1:27017/meetonmemory_test",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      },
    );
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await MeetingPattern.deleteMany({});
    await Meeting.deleteMany({});
    await ActionItem.deleteMany({});
    await Organization.deleteMany({});

    const org = await Organization.create({ name: "Test Org" });
    orgId = org._id;
  });

  describe("detectOvertimeTrend", () => {
    it("creates an overtime pattern if 3 or more recent meetings are overtime", async () => {
      // Create 3 overtime meetings
      for (let i = 0; i < 3; i++) {
        await Meeting.create({
          title: `Overtime Meeting ${i}`,
          organization: orgId,
          uploadedBy: new mongoose.Types.ObjectId(),
          date: new Date(),
          duration: 30, // 30 minutes
          status: "completed",
          agendaItems: [
            { text: "Topic", actualDuration: 40 * 60000 }, // 40 minutes in ms
          ],
        });
      }

      await meetingPatternService.detectOvertimeTrend(orgId);

      const pattern = await MeetingPattern.findOne({
        organization: orgId,
        type: "overtime_trend",
      });
      expect(pattern).toBeTruthy();
      expect(pattern.severity).toBe("warning");
      expect(pattern.aiRecommendation).toBe("Mock AI Recommendation");
    });

    it("does not create a pattern if less than 3 recent meetings are overtime", async () => {
      await Meeting.create({
        title: "Overtime Meeting 1",
        organization: orgId,
        uploadedBy: new mongoose.Types.ObjectId(),
        date: new Date(),
        duration: 30,
        status: "completed",
        agendaItems: [{ text: "Topic", actualDuration: 40 * 60000 }],
      });

      await meetingPatternService.detectOvertimeTrend(orgId);

      const pattern = await MeetingPattern.findOne({
        organization: orgId,
        type: "overtime_trend",
      });
      expect(pattern).toBeNull();
    });
  });

  describe("detectDecliningAttendance", () => {
    it("creates a pattern for a series with declining attendance over 3 meetings", async () => {
      const seriesId = new mongoose.Types.ObjectId();

      // Meetings are created in chronological order, so occurrence 1 has 10, occurrence 2 has 8, occurrence 3 has 5
      await Meeting.create({
        title: "Meeting 1",
        organization: orgId,
        uploadedBy: new mongoose.Types.ObjectId(),
        date: new Date(),
        status: "completed",
        series: seriesId,
        seriesOccurrence: 1,
        participants: new Array(10).fill({ name: "User" }),
      });
      await Meeting.create({
        title: "Meeting 2",
        organization: orgId,
        uploadedBy: new mongoose.Types.ObjectId(),
        date: new Date(),
        status: "completed",
        series: seriesId,
        seriesOccurrence: 2,
        participants: new Array(8).fill({ name: "User" }),
      });
      await Meeting.create({
        title: "Meeting 3",
        organization: orgId,
        uploadedBy: new mongoose.Types.ObjectId(),
        date: new Date(),
        status: "completed",
        series: seriesId,
        seriesOccurrence: 3,
        participants: new Array(5).fill({ name: "User" }),
      });

      await meetingPatternService.detectDecliningAttendance(orgId);

      const pattern = await MeetingPattern.findOne({
        organization: orgId,
        type: "declining_attendance",
      });
      expect(pattern).toBeTruthy();
      expect(pattern.metadata.seriesId.toString()).toBe(seriesId.toString());
      expect(pattern.metadata.attendances).toEqual([10, 8, 5]);
    });
  });

  describe("detectStaleActionItems", () => {
    it("creates a pattern if there are 5 or more stale open action items", async () => {
      const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000); // 40 days ago

      for (let i = 0; i < 5; i++) {
        await ActionItem.create({
          text: `Action Item ${i}`,
          organization: orgId,
          sourceMeetingId: new mongoose.Types.ObjectId(),
          status: "open",
          createdAt: oldDate,
        });
      }

      await meetingPatternService.detectStaleActionItems(orgId);

      const pattern = await MeetingPattern.findOne({
        organization: orgId,
        type: "stale_action_items",
      });
      expect(pattern).toBeTruthy();
      expect(pattern.metadata.staleCount).toBe(5);
    });
  });
});
