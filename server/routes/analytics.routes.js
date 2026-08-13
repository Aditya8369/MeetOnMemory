const express = require("express");
const router = express.Router();
const MeetingAnalytics = require("../models/MeetingAnalytics");
const TranscriptAnalyzer = require("../services/transcriptAnalyzer");
const EngagementScorer = require("../services/engagementScorer");
const Meeting = require("../models/Meeting");
const ActionItem = require("../models/ActionItem");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

/**
 * @route   POST /api/analytics/meeting/:id/analyze
 * @desc    Trigger analysis of a meeting transcript and store results
 */
router.post("/meeting/:id/analyze", async (req, res) => {
  try {
    const { id } = req.params;
    const meeting = await Meeting.findById(id);

    if (!meeting || !meeting.transcript) {
      return res
        .status(404)
        .json({ success: false, error: "Meeting or transcript not found" });
    }

    // 1. Analyze transcript
    const transcriptData =
      typeof meeting.transcript === "string"
        ? JSON.parse(meeting.transcript)
        : meeting.transcript;

    const analytics = TranscriptAnalyzer.analyze(transcriptData);

    // 2. Count action items
    const actionItemCount = await ActionItem.countDocuments({ meetingId: id });

    // 3. Calculate scores
    const engagementScore = EngagementScorer.calculateEngagementScore(
      analytics,
      actionItemCount,
    );
    const efficiencyScore = EngagementScorer.calculateEfficiencyScore(
      meeting.duration || 30,
      actionItemCount,
    );
    const gini = EngagementScorer.calculateGini(analytics.distribution);

    // 4. Save to DB
    const result = await MeetingAnalytics.findOneAndUpdate(
      { meetingId: id },
      {
        meetingId: id,
        teamId: meeting.teamId,
        duration: meeting.duration || analytics.totalDuration / 60,
        participantCount: analytics.distribution.length,
        speakingTimeDistribution: analytics.distribution,
        engagementScore,
        efficiencyScore,
        participationBalanceScore: gini,
        silencePeriods: analytics.silencePeriods,
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
    const analytics = await MeetingAnalytics.findOne({
      meetingId: req.params.id,
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
      { $match: { teamId: require("mongoose").Types.ObjectId(teamId) } },
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

module.exports = router;
