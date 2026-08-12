import mongoose from "mongoose";
import MeetingHealth from "../models/meetingHealthModel.js";
import { calculateMeetingHealth } from "../services/meetingHealthService.js";

// @desc    Get health score for a meeting
// @route   GET /api/meeting-health/:meetingId
// @access  Private (org membership + meetings.view — enforced in routes)
export const getMeetingHealth = async (req, res, next) => {
  try {
    const { meetingId } = req.params;

    // First try to find existing record
    let healthRecord = await MeetingHealth.findOne({ meetingId });

    // If not found, compute it on the fly (meeting already authorized via middleware)
    if (!healthRecord) {
      healthRecord = await calculateMeetingHealth(meetingId);
    }

    res.status(200).json({
      success: true,
      data: healthRecord,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get organization health trends
// @route   GET /api/meeting-health/trends/:organizationId
// @access  Private (role + org scope — enforced here and in routes)
export const getOrganizationHealthTrends = async (req, res, next) => {
  try {
    const { organizationId } = req.params;

    if (!req.user?.organization) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Organization membership required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID",
      });
    }

    // Issue #1379: never trust client-supplied organizationId for trends
    if (req.user.organization.toString() !== String(organizationId)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You don't have access to this resource",
      });
    }

    // Get last 30 meetings health for trends
    const trends = await MeetingHealth.find({ organization: organizationId })
      .sort({ createdAt: 1 }) // Chronological order
      .limit(30)
      .populate("meetingId", "title date");

    if (!trends || trends.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          trends: [],
          benchmarks: null,
        },
      });
    }

    // Calculate benchmarks (averages across the fetched meetings)
    const totalMeetings = trends.length;
    let sumComposite = 0;
    let sumAgenda = 0;
    let sumTime = 0;
    let sumEngagement = 0;
    let sumActionItems = 0;
    let sumSentiment = 0;

    trends.forEach((t) => {
      sumComposite += t.compositeScore;
      sumAgenda += t.factors.agendaCoverage;
      sumTime += t.factors.timeAdherence;
      sumEngagement += t.factors.engagement;
      sumActionItems += t.factors.actionItemClarity;
      sumSentiment += t.factors.sentiment;
    });

    const benchmarks = {
      averageComposite: Math.round(sumComposite / totalMeetings),
      averageAgendaCoverage: Math.round(sumAgenda / totalMeetings),
      averageTimeAdherence: Math.round(sumTime / totalMeetings),
      averageEngagement: Math.round(sumEngagement / totalMeetings),
      averageActionItemClarity: Math.round(sumActionItems / totalMeetings),
      averageSentiment: Math.round(sumSentiment / totalMeetings),
    };

    res.status(200).json({
      success: true,
      data: {
        trends,
        benchmarks,
      },
    });
  } catch (error) {
    next(error);
  }
};
