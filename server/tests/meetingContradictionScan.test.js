import mongoose from "mongoose";
import Decision from "../models/decisionModel.js";
import ActionItem from "../models/actionItemModel.js";
import ConflictSet from "../models/conflictModel.js";
import {
  detectMeetingConflicts,
  getMeetingConflicts,
} from "../services/conflictDetection/conflictDetectionService.js";

const organizationId = new mongoose.Types.ObjectId();
const meetingA = new mongoose.Types.ObjectId();
const meetingB = new mongoose.Types.ObjectId();

beforeAll(async () => {
  await mongoose.connect(
    `${process.env.TEST_MONGODB_URI}/meeting_conflict_scan`,
  );
});

describe("detectMeetingConflicts", () => {
  test("detects contradictions specific to a single meeting's decisions", async () => {
    const [dOld, dNew] = await Decision.create([
      {
        text: "Database is PostgreSQL",
        sourceMeetingId: meetingA,
        organization: organizationId,
        createdAt: new Date("2026-01-01"),
      },
      {
        text: "Database migrated to MongoDB",
        sourceMeetingId: meetingB,
        organization: organizationId,
        createdAt: new Date("2026-01-10"),
      },
    ]);

    const report = await detectMeetingConflicts({
      meetingId: meetingB,
      organization: organizationId,
      dryRun: false,
      useAI: false,
    });

    expect(report.meetingId).toBe(meetingB.toString());
    expect(report.totalConflictsFound).toBe(1);
    expect(report.results.decision.conflictsFound).toBe(1);

    const storedConflicts = await getMeetingConflicts(meetingB, {
      organization: organizationId,
    });
    expect(storedConflicts).toHaveLength(1);
    expect(storedConflicts[0].memberIds.map((id) => id.toString())).toContain(
      dNew._id.toString(),
    );
  });

  test("returns 0 conflicts when meeting decisions have no contradictions", async () => {
    const meetingClean = new mongoose.Types.ObjectId();
    await Decision.create({
      text: "Deploy security patch to production",
      sourceMeetingId: meetingClean,
      organization: organizationId,
    });

    const report = await detectMeetingConflicts({
      meetingId: meetingClean,
      organization: organizationId,
      dryRun: true,
      useAI: false,
    });

    expect(report.totalConflictsFound).toBe(0);
  });
});
