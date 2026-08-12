import MeetingAnalytics from "../models/MeetingAnalytics.js";
import Meeting from "../models/meetingModel.js";
import {
  analyzeMeeting,
  getOrganizationAnalytics,
} from "../services/audioAnalyticsService.js";
import mongoose from "mongoose";
import { groupByPeriod } from "../utils/periodBucket.js";

/**
 * Meeting Analytics Controller
 * Handles HTTP requests for meeting analytics endpoints
 */

/**
 * @desc Get analytics for a specific meeting
 * @route GET /api/analytics/meetings/:meetingId
 * @access Private
 */
export const getMeetingAnalytics = async (req, res) => {
  try {
    const { meetingId } = req.params;

    if (!mongoose.isValidObjectId(meetingId)) {
      return res.status(400).json({ message: "Invalid meeting ID" });
    }

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    // Check organization access
    if (meeting.organization.toString() !== req.user.organization.toString()) {
      return res
        .status(403)
        .json({ message: "Forbidden: Not part of organization" });
    }

    const analytics = await MeetingAnalytics.findOne({ meeting: meetingId })
      .populate("speakers.userId", "name email profilePicture")
      .populate("meeting", "title date meetingType participants");

    if (!analytics) {
      return res.status(404).json({
        message: "Analytics not found. Trigger analysis first.",
        status: "not_analyzed",
      });
    }

    res.status(200).json(analytics);
  } catch (error) {
    console.error("Error fetching meeting analytics:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/**
 * @desc Trigger analysis for a meeting
 * @route POST /api/analytics/analyze/:meetingId
 * @access Private
 */
export const triggerAnalysis = async (req, res) => {
  try {
    const { meetingId } = req.params;

    if (!mongoose.isValidObjectId(meetingId)) {
      return res.status(400).json({ message: "Invalid meeting ID" });
    }

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    // Check organization access
    if (meeting.organization.toString() !== req.user.organization.toString()) {
      return res
        .status(403)
        .json({ message: "Forbidden: Not part of organization" });
    }

    // Check if already analyzing
    const existing = await MeetingAnalytics.findOne({ meeting: meetingId });
    if (existing && existing.status === "analyzing") {
      return res.status(400).json({
        message: "Analysis already in progress",
        status: "analyzing",
      });
    }

    // Trigger analysis asynchronously
    analyzeMeeting(meetingId)
      .then(() => {
        console.log(`Analytics completed for meeting ${meetingId}`);
      })
      .catch((error) => {
        console.error(`Analytics failed for meeting ${meetingId}:`, error);
      });

    res.status(202).json({
      message: "Analysis started",
      status: "analyzing",
    });
  } catch (error) {
    console.error("Error triggering analysis:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/**
 * @desc Get organization-wide analytics
 * @route GET /api/analytics/organization/:orgId
 * @access Private
 */
export const getOrganizationAnalyticsEndpoint = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { startDate, endDate } = req.query;

    if (!mongoose.isValidObjectId(orgId)) {
      return res.status(400).json({ message: "Invalid organization ID" });
    }

    // Check organization access
    if (orgId !== req.user.organization.toString()) {
      return res
        .status(403)
        .json({ message: "Forbidden: Not part of organization" });
    }

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const analytics = await getOrganizationAnalytics(orgId, filters);

    res.status(200).json(analytics);
  } catch (error) {
    console.error("Error fetching organization analytics:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/**
 * @desc Get speaker breakdown for a meeting
 * @route GET /api/analytics/speakers/:meetingId
 * @access Private
 */
export const getSpeakerBreakdown = async (req, res) => {
  try {
    const { meetingId } = req.params;

    if (!mongoose.isValidObjectId(meetingId)) {
      return res.status(400).json({ message: "Invalid meeting ID" });
    }

    const analytics = await MeetingAnalytics.findOne({
      meeting: meetingId,
    }).populate("speakers.userId", "name email profilePicture");

    if (!analytics) {
      return res.status(404).json({ message: "Analytics not found" });
    }

    // Check organization access
    if (
      analytics.organization.toString() !== req.user.organization.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Forbidden: Not part of organization" });
    }

    const speakerData = analytics.speakers.map((speaker) => ({
      userId: speaker.userId,
      name: speaker.name,
      email: speaker.email,
      totalTime: speaker.totalTime,
      formattedTime: formatDuration(speaker.totalTime),
      interventionCount: speaker.interventionCount,
      averageInterventionLength: speaker.averageInterventionLength,
      formattedAvgLength: formatDuration(speaker.averageInterventionLength),
      percentage: speaker.percentage,
      dominanceScore: speaker.dominanceScore,
    }));

    res.status(200).json({
      speakers: speakerData,
      totalSpeakers: speakerData.length,
      metrics: analytics.metrics,
    });
  } catch (error) {
    console.error("Error fetching speaker breakdown:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/**
 * @desc Get trend data over time
 * @route GET /api/analytics/trends/:orgId
 * @access Private
 */
export const getTrends = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { period = "weekly" } = req.query;

    if (!mongoose.isValidObjectId(orgId)) {
      return res.status(400).json({ message: "Invalid organization ID" });
    }

    // Check organization access
    if (orgId !== req.user.organization.toString()) {
      return res
        .status(403)
        .json({ message: "Forbidden: Not part of organization" });
    }

    const analytics = await MeetingAnalytics.find({
      organization: orgId,
      status: "completed",
    })
      .populate("meeting", "title date meetingType")
      .sort({ analyzedAt: -1 })
      .limit(100);

    // Group by period. This used to mix `getDay()`/`setDate()` (local calendar)
    // with `toISOString()` (UTC), which split one week across two buckets on
    // any server whose TZ is not UTC — and it derived the monthly key from
    // local `getFullYear()`/`getMonth()` while the daily key came from UTC, so
    // the three granularities did not agree with each other (Issue #1453).
    const { buckets } = groupByPeriod(analytics, {
      granularity: period,
      getDate: (item) => item.analyzedAt,
    });

    const trends = buckets.map(({ period: periodKey, items }) => {
      const metrics = items.map((a) => a.metrics);
      const average = (pick) =>
        metrics.reduce((sum, m) => sum + pick(m), 0) / metrics.length;

      return {
        period: periodKey,
        meetingCount: items.length,
        avgEngagement: average((m) => m.engagementScore),
        avgParticipationEquity: average((m) => m.participationEquity),
        avgDuration: average((m) => m.totalDuration),
        avgDecisionDensity: average((m) => m.decisionDensity),
      };
    });

    // `groupByPeriod` returns buckets in chronological order, so the
    // `new Date(a.period)` sort that used to run here is gone.
    res.status(200).json({ trends, period });
  } catch (error) {
    console.error("Error fetching trends:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/**
 * Helper function to format duration in seconds to human-readable format
 */
const formatDuration = (seconds) => {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
};
