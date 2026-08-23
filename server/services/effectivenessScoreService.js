import EffectivenessScore from "../models/effectivenessScoreModel.js";
import MeetingGoal from "../models/meetingGoalModel.js";
import ActionItem from "../models/actionItemModel.js";
import MeetingFeedback from "../models/meetingFeedbackModel.js";
import Decision from "../models/decisionModel.js";
import MeetingAnalytics from "../models/MeetingAnalytics.js";

class EffectivenessScoreService {
  /**
   * Calculate and save effectiveness score for a meeting
   */
  async calculateMeetingScore(meetingId, organizationId, seriesId = null) {
    // 1. Goal Completion Rate (0-100)
    const goals = await MeetingGoal.findOne({ meetingId });
    let goalCompletionRate = 0;
    if (goals && goals.goals && goals.goals.length > 0) {
      const achieved = goals.goals.filter(
        (g) => g.status === "achieved",
      ).length;
      const partially = goals.goals.filter(
        (g) => g.status === "partially_achieved",
      ).length;
      const score = achieved * 1 + partially * 0.5;
      goalCompletionRate = (score / goals.goals.length) * 100;
    }

    // 2. Action Item Follow-Through (0-100)
    const actionItems = await ActionItem.find({ meeting: meetingId });
    let actionItemFollowThrough = 0;
    if (actionItems.length > 0) {
      const completed = actionItems.filter(
        (ai) => ai.status === "completed",
      ).length;
      actionItemFollowThrough = (completed / actionItems.length) * 100;
    }

    // 3. Participant Satisfaction (0-100)
    const feedback = await MeetingFeedback.find({ meetingId });
    let participantSatisfaction = 0;
    if (feedback.length > 0) {
      const totalRating = feedback.reduce((sum, f) => sum + (f.rating || 0), 0);
      // Assuming rating is 1-5
      participantSatisfaction = (totalRating / feedback.length / 5) * 100;
    }

    // 4. Decision Clarity (0-100)
    const decisions = await Decision.find({ meeting: meetingId });
    let decisionClarity = 0;
    if (decisions.length > 0) {
      const clearDecisions = decisions.filter(
        (d) => d.status === "final",
      ).length;
      decisionClarity = (clearDecisions / decisions.length) * 100;
    }

    // 5. Time Efficiency (0-100)
    const analytics = await MeetingAnalytics.findOne({ meetingId });
    let timeEfficiency = 0;
    if (analytics && analytics.durationMetrics) {
      const { scheduledDuration, actualDuration } = analytics.durationMetrics;
      if (scheduledDuration && actualDuration) {
        // Simple metric: 100 if ended early/on time, decays if went over
        if (actualDuration <= scheduledDuration) {
          timeEfficiency = 100;
        } else {
          const ratio = scheduledDuration / actualDuration; // e.g. 60 / 90 = 0.66
          timeEfficiency = Math.max(0, ratio * 100);
        }
      }
    }

    // Overall Score (Weighted average)
    // Weights: Goals 30%, Action Items 25%, Decisions 20%, Satisfaction 15%, Time 10%
    const weights = {
      goalCompletionRate: 0.3,
      actionItemFollowThrough: 0.25,
      decisionClarity: 0.2,
      participantSatisfaction: 0.15,
      timeEfficiency: 0.1,
    };

    const overallScore =
      goalCompletionRate * weights.goalCompletionRate +
      actionItemFollowThrough * weights.actionItemFollowThrough +
      decisionClarity * weights.decisionClarity +
      participantSatisfaction * weights.participantSatisfaction +
      timeEfficiency * weights.timeEfficiency;

    const dimensions = {
      goalCompletionRate: Math.round(goalCompletionRate),
      actionItemFollowThrough: Math.round(actionItemFollowThrough),
      participantSatisfaction: Math.round(participantSatisfaction),
      decisionClarity: Math.round(decisionClarity),
      timeEfficiency: Math.round(timeEfficiency),
    };

    // Save or Update
    const effectivenessScore = await EffectivenessScore.findOneAndUpdate(
      { meetingId },
      {
        meetingId,
        seriesId,
        organizationId,
        overallScore: Math.round(overallScore),
        dimensions,
      },
      { new: true, upsert: true },
    );

    return effectivenessScore;
  }

  /**
   * Get effectiveness score for a meeting
   */
  async getMeetingScore(meetingId) {
    return await EffectivenessScore.findOne({ meetingId });
  }

  /**
   * Get organization-level trend
   */
  async getOrganizationTrends(organizationId, days = 30) {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    const scores = await EffectivenessScore.find({
      organizationId,
      createdAt: { $gte: dateLimit },
    }).sort({ createdAt: 1 });

    // Group by day for line chart
    const trends = scores.reduce((acc, score) => {
      const date = score.createdAt.toISOString().split("T")[0];
      if (!acc[date]) {
        acc[date] = { count: 0, totalScore: 0 };
      }
      acc[date].count += 1;
      acc[date].totalScore += score.overallScore;
      return acc;
    }, {});

    const trendData = Object.keys(trends).map((date) => ({
      date,
      averageScore: Math.round(trends[date].totalScore / trends[date].count),
    }));

    return trendData;
  }

  /**
   * Get series-level trend
   */
  async getSeriesTrends(seriesId, limit = 10) {
    const scores = await EffectivenessScore.find({ seriesId })
      .sort({ createdAt: -1 })
      .limit(limit);

    // Return in chronological order
    return scores.reverse().map((score) => ({
      meetingId: score.meetingId,
      date: score.createdAt.toISOString().split("T")[0],
      overallScore: score.overallScore,
    }));
  }
}

export default new EffectivenessScoreService();
