import express from "express";
import mongoose from "mongoose";
const router = express.Router();
import MeetingAnalytics from "../models/MeetingAnalytics.js";
import TranscriptAnalyzer from "../services/transcriptAnalyzer.js";
import EngagementScorer from "../services/engagementScorer.js";
import Meeting from "../models/Meeting.js";
import ActionItem from "../models/ActionItem.js";
import { protect } from "../middleware/authMiddleware.js";

router.use(protect);

/**
 * @route   POST /api/analytics/meeting/:id/analyze
 * @desc    Trigger analysis of a meeting transcript and store results
 */
router.post("/meeting/:id/analyze", async (req, res) => {
  try {
    const { id } = req.params;
    // Tenant authorization: Scope to user's organization
    const meeting = await Meeting.findOne({
      _id: id,
      organization: req.user.organization,
    });

    if (!meeting || !meeting.transcript) {
      return res
        .status(404)
        .json({ success: false, error: "Meeting or transcript not found" });
    }

    const transcriptData =
      typeof meeting.transcript === "string"
        ? JSON.parse(meeting.transcript)
        : meeting.transcript;

    const analytics = TranscriptAnalyzer.analyze(transcriptData);
    const actionItemCount = await ActionItem.countDocuments({ meetingId: id });

    // Duration inconsistency: Calculate once and reuse
    const durationMinutes =
      meeting.duration || Math.round(analytics.totalDuration / 60);

    const engagementScore = EngagementScorer.calculateEngagementScore(
      analytics,
      actionItemCount,
    );
    const efficiencyScore = EngagementScorer.calculateEfficiencyScore(
      durationMinutes,
      actionItemCount,
    );
    const gini = EngagementScorer.calculateGini(analytics.distribution);

    const result = await MeetingAnalytics.findOneAndUpdate(
      { meetingId: id },
      {
        meeting: meeting._id, // Missing required relations
        organization: meeting.organization, // Missing required relations
        meetingId: id,
        teamId: meeting.teamId,
        duration: durationMinutes,
        participantCount: analytics.distribution.length,
        speakingTimeDistribution: analytics.distribution,
        engagementScore,
        efficiencyScore,
        participationBalanceScore: gini,
        silencePeriodsCount: analytics.silencePeriods, // silencePeriods type mismatch (mapped to Count)
        overlapRatio: analytics.overlapRatio,
        actionItemsGenerated: actionItemCount,
        lastAnalyzedAt: new Date(),
      },
      { upsert: true, new: true },
    );

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/analytics/meeting/:id
 * @desc    Get analytics for a specific meeting
 */
router.get("/meeting/:id", async (req, res) => {
  try {
    // Tenant authorization
    const analytics = await MeetingAnalytics.findOne({
      meetingId: req.params.id,
      organization: req.user.organization,
    });
    if (!analytics) {
      return res.status(404).json({
        success: false,
        error: "Analytics not found. Run analysis first.",
      });
    }
    res.status(200).json({ success: true, data: analytics });
  } catch (_error) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

/**
 * @route   GET /api/analytics/team/:teamId/summary
 * @desc    Get aggregated team analytics (averages, trends)
 */
router.get("/team/:teamId/summary", async (req, res) => {
  try {
    const { teamId } = req.params;

    const summary = await MeetingAnalytics.aggregate([
      {
        $match: {
          teamId: new mongoose.Types.ObjectId(teamId),
          organization: req.user.organization,
        },
      },
      {
        $group: {
          _id: null,
          totalMeetings: { $sum: 1 },
          avgEngagement: { $avg: "$engagementScore" },
          avgEfficiency: { $avg: "$efficiencyScore" },
          avgDuration: { $avg: "$duration" },
          avgBalance: { $avg: "$participationBalanceScore" },
        },
      },
    ]);

    res.status(200).json({ success: true, data: summary[0] || {} });
  } catch (_error) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

/**
 * @route   GET /api/analytics/team/:teamId/recent
 * @desc    Get recent meetings with joined analytics data
 */
router.get("/team/:teamId/recent", async (req, res) => {
  try {
    const { teamId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const meetings = await Meeting.aggregate([
      {
        $match: {
          teamId: new mongoose.Types.ObjectId(teamId),
          organization: req.user.organization,
        },
      },
      { $sort: { date: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: MeetingAnalytics.collection.collectionName,
          localField: "_id",
          foreignField: "meetingId",
          as: "analytics",
        },
      },
      { $unwind: { path: "$analytics", preserveNullAndEmptyArrays: true } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        meetings,
        pagination: { limit, total: meetings.length },
      },
    });
  } catch (_error) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
