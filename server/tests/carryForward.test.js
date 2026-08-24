import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import MeetingSeries from "../models/meetingSeriesModel.js";
import Meeting from "../models/meetingModel.js";
import ActionItem from "../models/actionItemModel.js";
import CarryForwardConfig from "../models/carryForwardConfigModel.js";
import User from "../models/userModel.js";
import { NotFoundError } from "../utils/errors.js";

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
  let user, orgId, foreignOrgId, series, pastMeeting, currentMeeting;
  let carryForwardService;

  beforeEach(async () => {
    orgId = new mongoose.Types.ObjectId();
    foreignOrgId = new mongoose.Types.ObjectId();

    user = await User.create({
      name: "Test User",
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      clerkId: "test_clerk_id",
      status: "active",
      password: "password123",
      organization: orgId,
    });

    series = await MeetingSeries.create({
      title: "Weekly Sync",
      createdBy: user._id,
      organization: orgId,
      recurrencePattern: "weekly",
      startDate: new Date(),
      endDate: new Date(Date.now() + 100000000),
      time: "10:00",
    });

    pastMeeting = await Meeting.create({
      title: "Past Meeting",
      uploadedBy: user._id,
      organization: orgId,
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
      organization: orgId,
      date: new Date(),
      series: series._id,
      seriesOccurrence: 2,
      status: "uploaded",
      agendaItems: [{ text: "New Item", status: "pending" }],
    });

    ({ default: carryForwardService } =
      await import("../services/carryForwardService.js"));
  });

  describe("Service logic", () => {
    it("should fetch initial config and default maxCarriedItems to 10", async () => {
      const config = await carryForwardService.getConfig(series._id, orgId);
      expect(config.carryForwardRules.maxCarriedItems).toBe(10);
      expect(config.carryForwardRules.includeUnfinishedAgenda).toBe(true);
      expect(config.carryForwardRules.includeOpenActionItems).toBe(true);
    });

    it("should update config", async () => {
      const updated = await carryForwardService.updateConfig(
        series._id,
        {
          includeUnfinishedAgenda: false,
          includeOpenActionItems: true,
          maxCarriedItems: 5,
        },
        orgId,
      );
      expect(updated.carryForwardRules.includeUnfinishedAgenda).toBe(false);
      expect(updated.carryForwardRules.maxCarriedItems).toBe(5);
    });

    it("should generate correct preview (unfinished agenda & open actions)", async () => {
      const preview = await carryForwardService.getCarryForwardPreview(
        series._id,
        orgId,
      );

      expect(preview.pastMeetingId.toString()).toBe(pastMeeting._id.toString());
      expect(preview.agendaItems).toHaveLength(3); // Pending 1, Pending 2, Active
      expect(preview.actionItems).toHaveLength(1); // Action 1
      expect(preview.actionItems[0].text).toContain(
        "Review Action Item: Action 1",
      );
    });

    it("should limit carried items based on maxCarriedItems", async () => {
      await carryForwardService.updateConfig(
        series._id,
        {
          includeUnfinishedAgenda: true,
          includeOpenActionItems: true,
          maxCarriedItems: 2,
        },
        orgId,
      );

      const preview = await carryForwardService.getCarryForwardPreview(
        series._id,
        orgId,
      );
      expect(preview.agendaItems.length + preview.actionItems.length).toBe(2);
    });

    it("should prepend carried items to current meeting agenda", async () => {
      const result = await carryForwardService.applyCarryForward(
        series._id,
        currentMeeting._id,
        orgId,
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

  describe("Series ownership (Issue #1666)", () => {
    let foreignSeries;

    beforeEach(async () => {
      foreignSeries = await MeetingSeries.create({
        title: "Foreign Series",
        createdBy: user._id,
        organization: foreignOrgId,
        recurrencePattern: "weekly",
        startDate: new Date(),
        endDate: new Date(Date.now() + 100000000),
        time: "10:00",
      });
    });

    it("allows config retrieval for a series in the authenticated organization", async () => {
      const config = await carryForwardService.getConfig(series._id, orgId);
      expect(config.seriesId.toString()).toBe(series._id.toString());
      expect(config.organization.toString()).toBe(orgId.toString());
    });

    it("rejects config retrieval for a foreign series", async () => {
      await expect(
        carryForwardService.getConfig(foreignSeries._id, orgId),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("rejects config update for a foreign series", async () => {
      await expect(
        carryForwardService.updateConfig(
          foreignSeries._id,
          { maxCarriedItems: 1 },
          orgId,
        ),
      ).rejects.toBeInstanceOf(NotFoundError);

      expect(
        await CarryForwardConfig.findOne({ seriesId: foreignSeries._id }),
      ).toBeNull();
    });

    it("rejects preview for a foreign series", async () => {
      await expect(
        carryForwardService.getCarryForwardPreview(foreignSeries._id, orgId),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("rejects apply for a foreign series", async () => {
      await expect(
        carryForwardService.applyCarryForward(
          foreignSeries._id,
          currentMeeting._id,
          orgId,
        ),
      ).rejects.toBeInstanceOf(NotFoundError);

      const unchanged = await Meeting.findById(currentMeeting._id);
      expect(unchanged.agendaItems).toHaveLength(1);
    });

    it("does not modify a foreign currentMeetingId", async () => {
      const foreignMeeting = await Meeting.create({
        title: "Foreign Current Meeting",
        uploadedBy: user._id,
        organization: foreignOrgId,
        date: new Date(),
        series: foreignSeries._id,
        seriesOccurrence: 1,
        status: "uploaded",
        agendaItems: [{ text: "Do not touch", status: "pending" }],
      });

      await expect(
        carryForwardService.applyCarryForward(
          series._id,
          foreignMeeting._id,
          orgId,
        ),
      ).rejects.toBeInstanceOf(NotFoundError);

      const unchanged = await Meeting.findById(foreignMeeting._id);
      expect(unchanged.agendaItems).toHaveLength(1);
      expect(unchanged.agendaItems[0].text).toBe("Do not touch");
    });

    it("rejects a nonexistent series", async () => {
      const missingId = new mongoose.Types.ObjectId();
      await expect(
        carryForwardService.getConfig(missingId, orgId),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("ignores a client-supplied foreign organization id as a bypass", async () => {
      // The service only trusts the organizationId argument supplied by the
      // controller from req.user — passing the foreign org does not grant
      // access to this org's series.
      await expect(
        carryForwardService.getConfig(series._id, foreignOrgId),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
