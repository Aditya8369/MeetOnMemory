import ParticipantEngagement from "../models/participantEngagementModel.js";
import Meeting from "../models/meetingModel.js";
import ActionItem from "../models/actionItemModel.js";
import Decision from "../models/decisionModel.js";
import MeetingAnalytics from "../models/MeetingAnalytics.js";
import * as GenerativeAIService from "./GenerativeAIService.js";

class ParticipantEngagementService {
  /**
   * Re-calculates and updates the participant's scorecard for a given organization
   * using real database aggregations instead of placeholder heuristics.
   */
  static async updateScorecard(userId, orgId) {
    try {
      // 1. Gather historical metrics from database collections
      const metrics = await this.aggregateParticipantMetrics(userId, orgId);

      // 2. Compute dimensional scores based on real database aggregations (0 - 100)
      const speakingScore =
        metrics.meetingsAttended > 0
          ? Math.min(
              100,
              Math.max(
                0,
                Math.round(
                  (metrics.totalSpeakingTimeMinutes /
                    (metrics.meetingsAttended * 5)) *
                    100,
                ),
              ),
            )
          : metrics.totalSpeakingTimeMinutes > 0
            ? 100
            : 0;

      const aiScore =
        metrics.actionItemsAssigned > 0
          ? Math.round(
              (metrics.actionItemsCompleted / metrics.actionItemsAssigned) *
                100,
            )
          : 100;

      const decisionsScore =
        metrics.meetingsAttended > 0
          ? Math.min(
              100,
              Math.round(
                (metrics.decisionsInvolved / metrics.meetingsAttended) * 100,
              ),
            )
          : metrics.decisionsInvolved > 0
            ? 100
            : 0;

      const attendanceScore =
        metrics.totalOrgMeetings > 0
          ? Math.min(
              100,
              Math.round(
                (metrics.meetingsAttended / metrics.totalOrgMeetings) * 100,
              ),
            )
          : 100;

      const aiQuality = Math.min(
        100,
        Math.max(0, Math.round(aiScore * 0.5 + attendanceScore * 0.5)),
      );

      const dimensionalScores = {
        speaking: speakingScore,
        actionItems: aiScore,
        decisions: decisionsScore,
        attendance: attendanceScore,
        aiQuality: aiQuality,
      };

      // 3. Compute overall score (weighted average)
      const overallScore = Math.round(
        dimensionalScores.speaking * 0.2 +
          dimensionalScores.actionItems * 0.25 +
          dimensionalScores.decisions * 0.2 +
          dimensionalScores.attendance * 0.2 +
          dimensionalScores.aiQuality * 0.15,
      );

      // 4. Generate AI Insights (Strengths/Growth Areas)
      let aiInsights = {
        strengths: ["Active participant in organizational meetings"],
        growthAreas: ["Continue driving decision follow-throughs"],
        lastGeneratedAt: new Date(),
      };

      try {
        if (
          typeof GenerativeAIService.generateAIInsightsForEngagement ===
          "function"
        ) {
          const insights =
            await GenerativeAIService.generateAIInsightsForEngagement(metrics);
          if (insights) {
            aiInsights = insights;
          }
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
   * Aggregates real base metrics from database collections:
   * Meeting, ActionItem, Decision, and MeetingAnalytics.
   */
  static async aggregateParticipantMetrics(userId, orgId) {
    // Meetings attended by user
    const meetingsAttended = await Meeting.countDocuments({
      organization: orgId,
      $or: [
        { "participants.userId": userId },
        { "participants.user": userId },
        { host: userId },
        { organizer: userId },
        { createdBy: userId },
      ],
    });

    const totalOrgMeetings = await Meeting.countDocuments({
      organization: orgId,
    });

    // Action Items assigned and completed
    const actionItemsAssigned = await ActionItem.countDocuments({
      organization: orgId,
      $or: [{ assignee: userId }, { assignedTo: userId }],
    });

    const actionItemsCompleted = await ActionItem.countDocuments({
      organization: orgId,
      $or: [{ assignee: userId }, { assignedTo: userId }],
      status: { $in: ["completed", "resolved", "done"] },
    });

    // Decisions involved
    const decisionsInvolved = await Decision.countDocuments({
      organization: orgId,
      $or: [
        { involvedUsers: userId },
        { creator: userId },
        { owner: userId },
        { author: userId },
      ],
    });

    // Real speaking time aggregated from MeetingAnalytics docs
    let totalSpeakingSeconds = 0;
    const analyticsDocs = await MeetingAnalytics.find({
      organization: orgId,
      $or: [
        { "speakers.userId": userId },
        { "speakingTimeDistribution.userId": userId },
      ],
    }).lean();

    analyticsDocs.forEach((doc) => {
      if (Array.isArray(doc.speakers)) {
        doc.speakers.forEach((spk) => {
          if (spk.userId && spk.userId.toString() === userId.toString()) {
            totalSpeakingSeconds += spk.totalTime || 0;
          }
        });
      }
      if (Array.isArray(doc.speakingTimeDistribution)) {
        doc.speakingTimeDistribution.forEach((dist) => {
          if (dist.userId && dist.userId.toString() === userId.toString()) {
            totalSpeakingSeconds += dist.duration || 0;
          }
        });
      }
    });

    const totalSpeakingTimeMinutes = Math.round(totalSpeakingSeconds / 60);

    return {
      meetingsAttended,
      totalOrgMeetings,
      totalSpeakingTimeMinutes,
      actionItemsAssigned,
      actionItemsCompleted,
      decisionsInvolved,
    };
  }

  /**
   * Asynchronous background job to recompute scorecards for all participants in an organization.
   */
  static async recomputeAllScorecards(orgId) {
    try {
      const meetings = await Meeting.find({ organization: orgId })
        .select("participants host organizer createdBy")
        .lean();
      const userIds = new Set();

      meetings.forEach((m) => {
        if (m.host) userIds.add(m.host.toString());
        if (m.organizer) userIds.add(m.organizer.toString());
        if (m.createdBy) userIds.add(m.createdBy.toString());
        if (Array.isArray(m.participants)) {
          m.participants.forEach((p) => {
            const id = p.userId || p.user || p._id;
            if (id) userIds.add(id.toString());
          });
        }
      });

      for (const userId of userIds) {
        await this.updateScorecard(userId, orgId);
      }
      return { totalRecomputed: userIds.size };
    } catch (err) {
      console.error("Error in recomputeAllScorecards:", err);
      throw err;
    }
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
