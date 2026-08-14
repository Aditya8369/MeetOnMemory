import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import MeetingSeries from "../models/meetingSeriesModel.js";
import Meeting from "../models/meetingModel.js";
import ActionItem from "../models/actionItemModel.js";
import CarryForwardConfig from "../models/carryForwardConfigModel.js";
import User from "../models/userModel.js";
import jwt from "jsonwebtoken";

// For this mock app we assume app is properly configured with routes
// If app is not exported we might need to mock or setup supertest with standard config.
// Let's mock the db connection
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await MeetingSeries.deleteMany({});
  await Meeting.deleteMany({});
  await ActionItem.deleteMany({});
  await CarryForwardConfig.deleteMany({});
  await User.deleteMany({});
});

describe("Carry Forward Feature Tests", () => {
  let user, token, series, pastMeeting, currentMeeting;

  beforeEach(async () => {
    user = await User.create({
      name: "Test User",
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      clerkId: "test_clerk_id",
      status: "active",
      password: "password123",
    });

    token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "test-secret");

    series = await MeetingSeries.create({
      title: "Weekly Sync",
      createdBy: user._id,
      recurrencePattern: "weekly",
      startDate: new Date(),
      endDate: new Date(Date.now() + 100000000),
      time: "10:00",
    });

    pastMeeting = await Meeting.create({
      title: "Past Meeting",
      uploadedBy: user._id,
      date: new Date(Date.now() - 86400000), // 1 day ago
      series: series._id,
      seriesOccurrence: 1,
      status: "completed",
      agendaItems: [
        { text: "Done Item", status: "completed" },
        { text: "Pending Item 1", status: "pending" },
        { text: "Pending Item 2", status: "pending" },
        { text: "Active Item", status: "active" },
      ],
    });

    await ActionItem.create({
      text: "Action 1",
      sourceMeetingId: pastMeeting._id,
      status: "open",
      owner: "Alice",
    });

    await ActionItem.create({
      text: "Action 2",
      sourceMeetingId: pastMeeting._id,
      status: "resolved",
      owner: "Bob",
    });

    currentMeeting = await Meeting.create({
      title: "Current Meeting",
      uploadedBy: user._id,
      date: new Date(),
      series: series._id,
      seriesOccurrence: 2,
      status: "uploaded",
      agendaItems: [{ text: "New Item", status: "pending" }],
    });
  });

  describe("Service logic", () => {
    // we'll require the service directly to test its methods
    it("should fetch initial config and default maxCarriedItems to 10", async () => {
      const { default: carryForwardService } =
        await import("../services/carryForwardService.js");
      const config = await carryForwardService.getConfig(series._id);
      expect(config.carryForwardRules.maxCarriedItems).toBe(10);
      expect(config.carryForwardRules.includeUnfinishedAgenda).toBe(true);
      expect(config.carryForwardRules.includeOpenActionItems).toBe(true);
    });

    it("should update config", async () => {
      const { default: carryForwardService } =
        await import("../services/carryForwardService.js");
      const updated = await carryForwardService.updateConfig(series._id, {
        includeUnfinishedAgenda: false,
        includeOpenActionItems: true,
        maxCarriedItems: 5,
      });
      expect(updated.carryForwardRules.includeUnfinishedAgenda).toBe(false);
      expect(updated.carryForwardRules.maxCarriedItems).toBe(5);
    });

    it("should generate correct preview (unfinished agenda & open actions)", async () => {
      const { default: carryForwardService } =
        await import("../services/carryForwardService.js");
      const preview = await carryForwardService.getCarryForwardPreview(
        series._id,
      );

      expect(preview.pastMeetingId.toString()).toBe(pastMeeting._id.toString());
      expect(preview.agendaItems).toHaveLength(3); // Pending 1, Pending 2, Active
      expect(preview.actionItems).toHaveLength(1); // Action 1
      expect(preview.actionItems[0].text).toContain(
        "Review Action Item: Action 1",
      );
    });

    it("should limit carried items based on maxCarriedItems", async () => {
      const { default: carryForwardService } =
        await import("../services/carryForwardService.js");
      await carryForwardService.updateConfig(series._id, {
        includeUnfinishedAgenda: true,
        includeOpenActionItems: true,
        maxCarriedItems: 2,
      });

      const preview = await carryForwardService.getCarryForwardPreview(
        series._id,
      );
      expect(preview.agendaItems.length + preview.actionItems.length).toBe(2);
    });

    it("should prepend carried items to current meeting agenda", async () => {
      const { default: carryForwardService } =
        await import("../services/carryForwardService.js");
      const result = await carryForwardService.applyCarryForward(
        series._id,
        currentMeeting._id,
      );
      expect(result.success).toBe(true);

      const updatedMeeting = await Meeting.findById(currentMeeting._id);
      // 3 agenda + 1 action + 1 existing = 5
      expect(updatedMeeting.agendaItems).toHaveLength(5);
      expect(
        updatedMeeting.agendaItems.some((i) => i.text.includes("Action 1")),
      ).toBe(true);
      expect(
        updatedMeeting.agendaItems.some((i) => i.text === "New Item"),
      ).toBe(true);
    });
  });
});
