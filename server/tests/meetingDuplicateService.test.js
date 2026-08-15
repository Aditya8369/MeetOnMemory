import mongoose from "mongoose";
import * as meetingDuplicateService from "../services/meetingDuplicateService.js";
import Meeting from "../models/meetingModel.js";
import DismissedDuplicate from "../models/dismissedDuplicateModel.js";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { jest } from "@jest/globals";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
});

describe("Meeting Duplicate Service", () => {
  let orgId;
  let userId;

  beforeEach(() => {
    orgId = new mongoose.Types.ObjectId();
    userId = new mongoose.Types.ObjectId();
  });

  describe("findDuplicates", () => {
    it("should find duplicates based on title similarity and date", async () => {
      const baseDate = new Date();
      const primary = await Meeting.create({
        title: "Weekly Engineering Sync",
        uploadedBy: userId,
        organization: orgId,
        date: baseDate,
        participants: [],
      });

      const secondary = await Meeting.create({
        title: "Weekly Engineering Sync",
        uploadedBy: userId,
        organization: orgId,
        date: new Date(baseDate.getTime() + 1000 * 60 * 60), // 1 hour later
        participants: [],
      });

      // Not duplicate (different title)
      await Meeting.create({
        title: "Quarterly Planning",
        uploadedBy: userId,
        organization: orgId,
        date: baseDate,
        participants: [],
      });

      const duplicates = await meetingDuplicateService.findDuplicates(
        primary._id,
      );
      expect(duplicates.length).toBe(1);
      expect(duplicates[0]._id.toString()).toBe(secondary._id.toString());
      expect(duplicates[0].similarity).toBeGreaterThan(0.9);
    });

    it("should filter out dismissed duplicates", async () => {
      const baseDate = new Date();
      const primary = await Meeting.create({
        title: "Weekly Engineering Sync",
        uploadedBy: userId,
        organization: orgId,
        date: baseDate,
      });

      const secondary = await Meeting.create({
        title: "Weekly Engineering Sync",
        uploadedBy: userId,
        organization: orgId,
        date: baseDate,
      });

      await meetingDuplicateService.dismissDuplicate(
        primary._id,
        secondary._id,
        userId,
      );

      const duplicates = await meetingDuplicateService.findDuplicates(
        primary._id,
      );
      expect(duplicates.length).toBe(0);
    });
  });

  describe("mergeMeetings", () => {
    it("should merge transcripts and participants, then soft-delete secondary", async () => {
      const primary = await Meeting.create({
        title: "Weekly Sync",
        uploadedBy: userId,
        organization: orgId,
        date: new Date(),
        transcript: "Hello world.",
        participants: [
          { user: userId, name: "Alice", email: "alice@test.com" },
        ],
      });

      const user2 = new mongoose.Types.ObjectId();
      const secondary = await Meeting.create({
        title: "Weekly Sync",
        uploadedBy: userId,
        organization: orgId,
        date: new Date(),
        transcript: "How are you.",
        participants: [
          { user: userId, name: "Alice", email: "alice@test.com" }, // duplicate
          { user: user2, name: "Bob", email: "bob@test.com" }, // new
        ],
      });

      const result = await meetingDuplicateService.mergeMeetings(
        primary._id,
        secondary._id,
        userId,
      );
      expect(result.success).toBe(true);

      const updatedPrimary = await Meeting.findById(primary._id);
      expect(updatedPrimary.transcript).toContain("Hello world.");
      expect(updatedPrimary.transcript).toContain("How are you.");
      expect(updatedPrimary.participants.length).toBe(2);

      const updatedSecondary = await Meeting.findById(secondary._id);
      expect(updatedSecondary.deletedAt).not.toBeNull();
      expect(updatedSecondary.deletedBy.toString()).toBe(userId.toString());
    });
  });
});
