import { jest } from "@jest/globals";
import effectivenessScoreService from "../services/effectivenessScoreService.js";
import EffectivenessScore from "../models/effectivenessScoreModel.js";
import MeetingGoal from "../models/meetingGoalModel.js";
import ActionItem from "../models/actionItemModel.js";
import MeetingFeedback from "../models/meetingFeedbackModel.js";
import Decision from "../models/decisionModel.js";
import MeetingAnalytics from "../models/MeetingAnalytics.js";

jest.mock("../models/effectivenessScoreModel.js");
jest.mock("../models/meetingGoalModel.js");
jest.mock("../models/actionItemModel.js");
jest.mock("../models/meetingFeedbackModel.js");
jest.mock("../models/decisionModel.js");
jest.mock("../models/MeetingAnalytics.js");

describe("Effectiveness Score Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("calculateMeetingScore", () => {
    it("should correctly calculate and save score", async () => {
      // Mock data
      MeetingGoal.findOne.mockResolvedValue({
        goals: [
          { status: "achieved" },
          { status: "achieved" },
          { status: "partially_achieved" },
          { status: "not_achieved" },
        ],
      }); // Score: (2*1 + 1*0.5) / 4 = 2.5 / 4 = 62.5% -> 63

      ActionItem.find.mockResolvedValue([
        { status: "completed" },
        { status: "completed" },
        { status: "completed" },
        { status: "pending" },
      ]); // Score: 3/4 = 75% -> 75

      MeetingFeedback.find.mockResolvedValue([{ rating: 4 }, { rating: 5 }]); // Score: 4.5/5 = 90% -> 90

      Decision.find.mockResolvedValue([
        { status: "final" },
        { status: "draft" },
      ]); // Score: 1/2 = 50% -> 50

      MeetingAnalytics.findOne.mockResolvedValue({
        durationMetrics: {
          scheduledDuration: 60,
          actualDuration: 60,
        },
      }); // Score: 100% -> 100

      EffectivenessScore.findOneAndUpdate.mockImplementation(
        (query, update) => update,
      );

      const result = await effectivenessScoreService.calculateMeetingScore(
        "meetingId",
        "orgId",
      );

      expect(MeetingGoal.findOne).toHaveBeenCalledWith({
        meetingId: "meetingId",
      });
      expect(EffectivenessScore.findOneAndUpdate).toHaveBeenCalled();

      const { dimensions } = result;
      expect(dimensions.goalCompletionRate).toBe(63);
      expect(dimensions.actionItemFollowThrough).toBe(75);
      expect(dimensions.participantSatisfaction).toBe(90);
      expect(dimensions.decisionClarity).toBe(50);
      expect(dimensions.timeEfficiency).toBe(100);

      // weights = Goals 30%, Action Items 25%, Decisions 20%, Satisfaction 15%, Time 10%
      // 0.3 * 62.5 = 18.75
      // 0.25 * 75 = 18.75
      // 0.2 * 50 = 10
      // 0.15 * 90 = 13.5
      // 0.1 * 100 = 10
      // Overall = 18.75 + 18.75 + 10 + 13.5 + 10 = 71

      expect(result.overallScore).toBe(71);
    });
  });
});
