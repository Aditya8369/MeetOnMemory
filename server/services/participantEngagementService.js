import ParticipantEngagement from "../models/participantEngagementModel.js";
import Meeting from "../models/meetingModel.js";
import ActionItem from "../models/actionItemModel.js";
import Decision from "../models/decisionModel.js";
import MeetingAnalytics from "../models/MeetingAnalytics.js";
import GenerativeAIService from "./GenerativeAIService.js";

class ParticipantEngagementService {
  /**
   * Re-calculates and updates the participant's scorecard for a given organization.
   */
  static async updateScorecard(userId, orgId) {
    try {
      // 1. Gather historical metrics
      const metrics = await this.aggregateParticipantMetrics(userId, orgId);

      // 2. Compute dimensional scores
      const speakingScore = Math.min(
        100,
        (metrics.totalSpeakingTimeMinutes / 60) * 100,
      ); // placeholder heuristic

      const aiScore =
        metrics.actionItemsAssigned > 0
          ? Math.round(
              (metrics.actionItemsCompleted / metrics.actionItemsAssigned) *
                100,
            )
          : 100;

      const decisionsScore = Math.min(100, metrics.decisionsInvolved * 10); // placeholder heuristic

      // We assume they attended these meetings vs total meetings (placeholder calculation)
      const attendanceScore = Math.min(100, metrics.meetingsAttended * 10);

      const aiQuality = 85; // Placeholder AI quality score

      const dimensionalScores = {
        speaking: speakingScore,
        actionItems: aiScore,
        decisions: decisionsScore,
        attendance: attendanceScore,
        aiQuality: aiQuality,
      };

      // 3. Compute overall score (weighted average)
      const overallScore = Math.round(
        dimensionalScores.speaking * 0.15 +
          dimensionalScores.actionItems * 0.3 +
          dimensionalScores.decisions * 0.2 +
          dimensionalScores.attendance * 0.15 +
          dimensionalScores.aiQuality * 0.2,
      );

      // 4. Generate AI Insights (Strengths/Growth Areas)
      let aiInsights = {
        strengths: ["Consistent contributor to decisions"],
        growthAreas: ["Could participate more in discussions"],
        lastGeneratedAt: new Date(),
      };

      try {
        const insights =
          await GenerativeAIService.generateAIInsightsForEngagement(metrics);
        if (insights) {
          aiInsights = insights;
        }
      } catch (err) {
        console.warn("Could not generate AI insights", err);
      }

      // 5. Update or create the scorecard
      const scorecard = await ParticipantEngagement.findOneAndUpdate(
        { userId, organizationId: orgId },
        {
          overallScore,
          dimensionalScores,
          metrics,
          aiInsights,
          lastCalculatedAt: new Date(),
          $push: {
            historicalTrends: {
              date: new Date(),
              score: overallScore,
              period: "week",
            },
          },
        },
        { new: true, upsert: true },
      );

      return scorecard;
    } catch (error) {
      console.error("Error updating participant scorecard:", error);
      throw error;
    }
  }

  /**
   * Aggregates base metrics from other collections.
   */
  static async aggregateParticipantMetrics(userId, orgId) {
    // Meetings attended
    const meetingsAttended = await Meeting.countDocuments({
      organization: orgId,
      participants: { $elemMatch: { userId: userId } },
    });

    // Action Items
    const actionItemsAssigned = await ActionItem.countDocuments({
      organization: orgId,
      assignee: userId,
    });

    const actionItemsCompleted = await ActionItem.countDocuments({
      organization: orgId,
      assignee: userId,
      status: { $in: ["completed", "resolved"] },
    });

    // Decisions involved
    const decisionsInvolved = await Decision.countDocuments({
      organization: orgId,
      involvedUsers: userId,
    });

    // We can compute speaking time via MeetingAnalytics
    // (mocking the aggregation for brevity)
    const totalSpeakingTimeMinutes = 15;

    return {
      meetingsAttended,
      totalSpeakingTimeMinutes,
      actionItemsAssigned,
      actionItemsCompleted,
      decisionsInvolved,
    };
  }

  /**
   * Fetch paginated organization rankings
   */
  static async getOrganizationRankings(
    orgId,
    { page = 1, limit = 20, sortBy = "overallScore", order = -1 },
  ) {
    const sortParams = { [sortBy]: order };
    const skip = (page - 1) * limit;

    const rankings = await ParticipantEngagement.find({ organizationId: orgId })
      .populate("userId", "name email profilePic")
      .sort(sortParams)
      .skip(skip)
      .limit(limit);

    const total = await ParticipantEngagement.countDocuments({
      organizationId: orgId,
    });

    return {
      rankings,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export default ParticipantEngagementService;
