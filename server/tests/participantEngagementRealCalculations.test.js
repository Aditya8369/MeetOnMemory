// server/tests/participantEngagementRealCalculations.test.js
import ParticipantEngagementService from "../services/participantEngagementService.js";
import Meeting from "../models/meetingModel.js";
import ActionItem from "../models/actionItemModel.js";
import Decision from "../models/decisionModel.js";
import MeetingAnalytics from "../models/MeetingAnalytics.js";
import ParticipantEngagement from "../models/participantEngagementModel.js";

// Mock Mongoose models
jest.mock("../models/meetingModel.js");
jest.mock("../models/actionItemModel.js");
jest.mock("../models/decisionModel.js");
jest.mock("../models/MeetingAnalytics.js");
jest.mock("../models/participantEngagementModel.js");
jest.mock("../services/GenerativeAIService.js", () => ({
  generateAIInsightsForEngagement: jest.fn().mockResolvedValue({
    strengths: ["Strong contributor"],
    growthAreas: ["Increase participation"],
  }),
}));

describe("Participant Engagement Real Scorecard Calculations (#1887)", () => {
  const userId = "507f1f77bcf86cd799439011";
  const orgId = "507f1f77bcf86cd799439022";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("aggregateParticipantMetrics should query database collections for real metrics", async () => {
    Meeting.countDocuments.mockResolvedValueOnce(4).mockResolvedValueOnce(5); // meetingsAttended: 4, totalOrgMeetings: 5
    ActionItem.countDocuments.mockResolvedValueOnce(3).mockResolvedValueOnce(2); // assigned: 3, completed: 2
    Decision.countDocuments.mockResolvedValue(2); // decisionsInvolved: 2

    MeetingAnalytics.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        {
          speakers: [{ userId, totalTime: 600 }], // 600 seconds = 10 minutes
          speakingTimeDistribution: [{ userId, duration: 300 }], // 300 seconds = 5 minutes
        },
      ]),
    });

    const metrics =
      await ParticipantEngagementService.aggregateParticipantMetrics(
        userId,
        orgId,
      );

    expect(metrics.meetingsAttended).toBe(4);
    expect(metrics.totalOrgMeetings).toBe(5);
    expect(metrics.actionItemsAssigned).toBe(3);
    expect(metrics.actionItemsCompleted).toBe(2);
    expect(metrics.decisionsInvolved).toBe(2);
    expect(metrics.totalSpeakingTimeMinutes).toBe(15);
  });

  it("updateScorecard should compute dynamic dimensional scores without hardcoded 15/85 placeholders", async () => {
    jest
      .spyOn(ParticipantEngagementService, "aggregateParticipantMetrics")
      .mockResolvedValue({
        meetingsAttended: 5,
        totalOrgMeetings: 10,
        totalSpeakingTimeMinutes: 25,
        actionItemsAssigned: 4,
        actionItemsCompleted: 4,
        decisionsInvolved: 3,
      });

    ParticipantEngagement.findOneAndUpdate.mockImplementation(
      (query, update) => update,
    );

    const scorecard = await ParticipantEngagementService.updateScorecard(
      userId,
      orgId,
    );

    expect(scorecard.dimensionalScores.actionItems).toBe(100); // 4/4 completed = 100%
    expect(scorecard.dimensionalScores.attendance).toBe(50); // 5/10 meetings = 50%
    expect(scorecard.overallScore).toBeGreaterThan(0);
    expect(scorecard.metrics.totalSpeakingTimeMinutes).toBe(25);
  });

  it("recomputeAllScorecards should trigger async recomputation for organization participants", async () => {
    Meeting.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest
          .fn()
          .mockResolvedValue([
            { host: userId, participants: [{ userId: "user-2" }] },
          ]),
      }),
    });

    jest
      .spyOn(ParticipantEngagementService, "updateScorecard")
      .mockResolvedValue({});

    const result =
      await ParticipantEngagementService.recomputeAllScorecards(orgId);

    expect(result.totalRecomputed).toBe(2); // userId + user-2
    expect(ParticipantEngagementService.updateScorecard).toHaveBeenCalledTimes(
      2,
    );
  });
});
