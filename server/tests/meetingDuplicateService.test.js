import mongoose from "mongoose";
import * as meetingDuplicateService from "../services/meetingDuplicateService.js";
import Meeting from "../models/meetingModel.js";
import Transcript from "../models/transcriptModel.js";
import ActionItem from "../models/actionItemModel.js";
import KeyMoment from "../models/keyMomentModel.js";
import MergeAudit from "../models/mergeAuditModel.js";
import { MongoMemoryReplSet } from "mongodb-memory-server";

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

describe("Meeting Duplicate Service — Issue #1601", () => {
  let orgId, orgIdB, userId;

  beforeEach(() => {
    orgId = new mongoose.Types.ObjectId();
    orgIdB = new mongoose.Types.ObjectId();
    userId = new mongoose.Types.ObjectId();
  });

  // ── Detection ───────────────────────────────────────────────────────

  describe("findDuplicates", () => {
    it("should find duplicates with matching titles within time window", async () => {
      const baseDate = new Date();
      const primary = await Meeting.create({
        title: "Weekly Engineering Sync",
        uploadedBy: userId,
        organization: orgId,
        date: baseDate,
        participants: [],
      });

      await Meeting.create({
        title: "Weekly Engineering Sync",
        uploadedBy: userId,
        organization: orgId,
        date: new Date(baseDate.getTime() + 60 * 60 * 1000),
        participants: [],
      });

      const duplicates = await meetingDuplicateService.findDuplicates(
        primary._id,
      );
      expect(duplicates.length).toBe(1);
      expect(duplicates[0].scores.title).toBeGreaterThan(0.9);
      expect(duplicates[0].confidence).toBeDefined();
    });

    it("should boost score when participants overlap", async () => {
      const baseDate = new Date();
      const sharedUser = new mongoose.Types.ObjectId();

      const primary = await Meeting.create({
        title: "Standup",
        uploadedBy: userId,
        organization: orgId,
        date: baseDate,
        participants: [
          { user: sharedUser, name: "Alice", email: "alice@test.com" },
          { user: userId, name: "Bob", email: "bob@test.com" },
        ],
      });

      await Meeting.create({
        title: "Standup",
        uploadedBy: userId,
        organization: orgId,
        date: baseDate,
        participants: [
          { user: sharedUser, name: "Alice", email: "alice@test.com" },
        ],
      });

      const duplicates = await meetingDuplicateService.findDuplicates(
        primary._id,
      );
      expect(duplicates.length).toBe(1);
      expect(duplicates[0].scores.participants).toBeGreaterThan(0);
    });

    it("should include transcript similarity when transcripts exist", async () => {
      const baseDate = new Date();
      const primary = await Meeting.create({
        title: "Sprint Review",
        uploadedBy: userId,
        organization: orgId,
        date: baseDate,
      });

      const secondary = await Meeting.create({
        title: "Sprint Review",
        uploadedBy: userId,
        organization: orgId,
        date: baseDate,
      });

      await Transcript.create({
        meeting: primary._id,
        organizationId: orgId,
        fullText: "We discussed the sprint goals and velocity metrics for Q3",
        segments: [],
      });
      await Transcript.create({
        meeting: secondary._id,
        organizationId: orgId,
        fullText: "We discussed the sprint goals and velocity metrics for Q3",
        segments: [],
      });

      const duplicates = await meetingDuplicateService.findDuplicates(
        primary._id,
      );
      expect(duplicates.length).toBe(1);
      expect(duplicates[0].scores.transcript).toBeGreaterThan(0.5);
    });

    it("should NOT return candidates outside time window", async () => {
      const primary = await Meeting.create({
        title: "Weekly Sync",
        uploadedBy: userId,
        organization: orgId,
        date: new Date("2026-01-01"),
      });

      await Meeting.create({
        title: "Weekly Sync",
        uploadedBy: userId,
        organization: orgId,
        date: new Date("2026-06-01"),
      });

      const duplicates = await meetingDuplicateService.findDuplicates(
        primary._id,
      );
      expect(duplicates.length).toBe(0);
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

    it("should NOT match low-confidence dissimilar meetings", async () => {
      const baseDate = new Date();
      const primary = await Meeting.create({
        title: "Engineering Team Standup",
        uploadedBy: userId,
        organization: orgId,
        date: baseDate,
        participants: [{ user: userId, name: "Alice" }],
      });

      await Meeting.create({
        title: "Quarterly Board Strategy Review",
        uploadedBy: userId,
        organization: orgId,
        date: baseDate,
        participants: [{ user: new mongoose.Types.ObjectId(), name: "Zara" }],
      });

      const duplicates = await meetingDuplicateService.findDuplicates(
        primary._id,
      );
      expect(duplicates.length).toBe(0);
    });

    // ── Cross-org isolation ─────────────────────────────────────────

    it("should NOT return meetings from a different organization", async () => {
      const baseDate = new Date();
      const primary = await Meeting.create({
        title: "Weekly Sync",
        uploadedBy: userId,
        organization: orgId,
        date: baseDate,
      });

      await Meeting.create({
        title: "Weekly Sync",
        uploadedBy: userId,
        organization: orgIdB,
        date: baseDate,
      });

      const duplicates = await meetingDuplicateService.findDuplicates(
        primary._id,
      );
      expect(duplicates.length).toBe(0);
    });
  });

  // ── Merge ─────────────────────────────────────────────────────────

  describe("mergeMeetings", () => {
    it("should merge transcripts, participants, and soft-delete secondary", async () => {
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
          { user: userId, name: "Alice", email: "alice@test.com" },
          { user: user2, name: "Bob", email: "bob@test.com" },
        ],
      });

      const result = await meetingDuplicateService.mergeMeetings(
        primary._id,
        secondary._id,
        userId,
      );
      expect(result.success).toBe(true);
      expect(result.mergeAuditId).toBeDefined();

      const updatedPrimary = await Meeting.findById(primary._id);
      expect(updatedPrimary.transcript).toContain("Hello world.");
      expect(updatedPrimary.transcript).toContain("How are you.");
      expect(updatedPrimary.participants.length).toBe(2);

      const updatedSecondary = await Meeting.findById(secondary._id);
      expect(updatedSecondary.deletedAt).not.toBeNull();
    });

    it("should merge transcript segments without duplicates", async () => {
      const primary = await Meeting.create({
        title: "Sync",
        uploadedBy: userId,
        organization: orgId,
        date: new Date(),
      });
      const secondary = await Meeting.create({
        title: "Sync",
        uploadedBy: userId,
        organization: orgId,
        date: new Date(),
      });

      await Transcript.create({
        meeting: primary._id,
        segments: [
          { text: "Hello", speaker: "Alice", startTime: 0, endTime: 5 },
          { text: "World", speaker: "Bob", startTime: 5, endTime: 10 },
        ],
        fullText: "Hello World",
      });
      await Transcript.create({
        meeting: secondary._id,
        segments: [
          { text: "Hello", speaker: "Alice", startTime: 0, endTime: 5 },
          { text: "Thanks", speaker: "Carol", startTime: 10, endTime: 15 },
        ],
        fullText: "Hello Thanks",
      });

      await meetingDuplicateService.mergeMeetings(
        primary._id,
        secondary._id,
        userId,
      );

      const transcript = await Transcript.findOne({ meeting: primary._id });
      expect(transcript.segments.length).toBe(3);
      const speakers = transcript.segments.map((s) => s.speaker);
      expect(speakers).toContain("Carol");
    });

    it("should re-parent action items without duplicating identical ones", async () => {
      const primary = await Meeting.create({
        title: "Sync",
        uploadedBy: userId,
        organization: orgId,
        date: new Date(),
      });
      const secondary = await Meeting.create({
        title: "Sync",
        uploadedBy: userId,
        organization: orgId,
        date: new Date(),
      });

      await ActionItem.create({
        text: "Fix login bug",
        sourceMeetingId: primary._id,
        organization: orgId,
      });
      await ActionItem.create({
        text: "Fix login bug",
        sourceMeetingId: secondary._id,
        organization: orgId,
      });
      await ActionItem.create({
        text: "Update docs",
        sourceMeetingId: secondary._id,
        organization: orgId,
      });

      await meetingDuplicateService.mergeMeetings(
        primary._id,
        secondary._id,
        userId,
      );

      const primaryItems = await ActionItem.find({
        sourceMeetingId: primary._id,
      });
      expect(primaryItems.length).toBe(2);
      expect(primaryItems.map((i) => i.text).sort()).toEqual([
        "Fix login bug",
        "Update docs",
      ]);
    });

    it("should re-parent key moments", async () => {
      const primary = await Meeting.create({
        title: "Sync",
        uploadedBy: userId,
        organization: orgId,
        date: new Date(),
      });
      const secondary = await Meeting.create({
        title: "Sync",
        uploadedBy: userId,
        organization: orgId,
        date: new Date(),
      });

      await KeyMoment.create({
        meetingId: secondary._id,
        userId,
        organization: orgId,
        snippet: "Decided to use React",
        startTime: 120,
        endTime: 130,
        category: "decision",
      });

      await meetingDuplicateService.mergeMeetings(
        primary._id,
        secondary._id,
        userId,
      );

      const moments = await KeyMoment.find({ meetingId: primary._id });
      expect(moments.length).toBe(1);
      expect(moments[0].snippet).toBe("Decided to use React");
    });

    it("should prevent merging a meeting with itself", async () => {
      const meeting = await Meeting.create({
        title: "Sync",
        uploadedBy: userId,
        organization: orgId,
        date: new Date(),
      });

      await expect(
        meetingDuplicateService.mergeMeetings(meeting._id, meeting._id, userId),
      ).rejects.toThrow("Cannot merge a meeting with itself");
    });

    it("should prevent merging cross-organization meetings", async () => {
      const primary = await Meeting.create({
        title: "Sync",
        uploadedBy: userId,
        organization: orgId,
        date: new Date(),
      });
      const secondary = await Meeting.create({
        title: "Sync",
        uploadedBy: userId,
        organization: orgIdB,
        date: new Date(),
      });

      await expect(
        meetingDuplicateService.mergeMeetings(
          primary._id,
          secondary._id,
          userId,
        ),
      ).rejects.toThrow("different organizations");
    });

    it("should prevent re-merging already-merged meetings", async () => {
      const primary = await Meeting.create({
        title: "Sync",
        uploadedBy: userId,
        organization: orgId,
        date: new Date(),
      });
      const secondary = await Meeting.create({
        title: "Sync",
        uploadedBy: userId,
        organization: orgId,
        date: new Date(),
      });

      await meetingDuplicateService.mergeMeetings(
        primary._id,
        secondary._id,
        userId,
      );

      await expect(
        meetingDuplicateService.mergeMeetings(
          primary._id,
          secondary._id,
          userId,
        ),
      ).rejects.toThrow(/already.*merged|deleted/i);
    });

    it("should create a merge audit record", async () => {
      const primary = await Meeting.create({
        title: "Sync",
        uploadedBy: userId,
        organization: orgId,
        date: new Date(),
      });
      const secondary = await Meeting.create({
        title: "Sync",
        uploadedBy: userId,
        organization: orgId,
        date: new Date(),
      });

      const result = await meetingDuplicateService.mergeMeetings(
        primary._id,
        secondary._id,
        userId,
      );

      const audit = await MergeAudit.findById(result.mergeAuditId);
      expect(audit).not.toBeNull();
      expect(audit.primaryMeeting.toString()).toBe(primary._id.toString());
      expect(audit.secondaryMeeting.toString()).toBe(secondary._id.toString());
      expect(audit.mergedBy.toString()).toBe(userId.toString());
      expect(audit.snapshot.secondaryTitle).toBe("Sync");
    });

    it("should rollback on failure without corrupting data", async () => {
      const primary = await Meeting.create({
        title: "Sync",
        uploadedBy: userId,
        organization: orgId,
        date: new Date(),
      });
      const fakeId = new mongoose.Types.ObjectId();

      await expect(
        meetingDuplicateService.mergeMeetings(primary._id, fakeId, userId),
      ).rejects.toThrow();

      const intact = await Meeting.findById(primary._id);
      expect(intact.deletedAt).toBeNull();
    });
  });

  // ── Rollback ──────────────────────────────────────────────────────

  describe("rollbackMerge", () => {
    it("should restore secondary meeting and re-point action items", async () => {
      const primary = await Meeting.create({
        title: "Sync",
        uploadedBy: userId,
        organization: orgId,
        date: new Date(),
      });
      const secondary = await Meeting.create({
        title: "Sync Copy",
        uploadedBy: userId,
        organization: orgId,
        date: new Date(),
      });

      await ActionItem.create({
        text: "Task from secondary",
        sourceMeetingId: secondary._id,
        organization: orgId,
      });

      const mergeResult = await meetingDuplicateService.mergeMeetings(
        primary._id,
        secondary._id,
        userId,
      );

      const rollbackResult = await meetingDuplicateService.rollbackMerge(
        mergeResult.mergeAuditId,
        userId,
      );
      expect(rollbackResult.success).toBe(true);

      const restoredSecondary = await Meeting.findById(secondary._id);
      expect(restoredSecondary.deletedAt).toBeNull();

      const restoredAi = await ActionItem.findOne({
        text: "Task from secondary",
      });
      expect(restoredAi.sourceMeetingId.toString()).toBe(
        secondary._id.toString(),
      );

      const audit = await MergeAudit.findById(mergeResult.mergeAuditId);
      expect(audit.rolledBack).toBe(true);
      expect(audit.rolledBackBy.toString()).toBe(userId.toString());
    });

    it("should reject double rollback", async () => {
      const primary = await Meeting.create({
        title: "Sync",
        uploadedBy: userId,
        organization: orgId,
        date: new Date(),
      });
      const secondary = await Meeting.create({
        title: "Sync",
        uploadedBy: userId,
        organization: orgId,
        date: new Date(),
      });

      const { mergeAuditId } = await meetingDuplicateService.mergeMeetings(
        primary._id,
        secondary._id,
        userId,
      );

      await meetingDuplicateService.rollbackMerge(mergeAuditId, userId);

      await expect(
        meetingDuplicateService.rollbackMerge(mergeAuditId, userId),
      ).rejects.toThrow("already been rolled back");
    });
  });
});
