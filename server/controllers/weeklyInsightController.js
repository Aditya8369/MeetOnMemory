import WeeklyInsight from "../models/weeklyInsightModel.js";
import { generateInsight } from "../services/weeklyInsightService.js";

export const getLatestInsight = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const insight = await WeeklyInsight.findOne({ organization: orgId })
      .sort({ createdAt: -1 })
      .populate("stalledActionItems.actionItem")
      .populate("stalledActionItems.meetingId");
    if (!insight) {
      return res.status(200).json(null); // No insight yet
    }
    res.status(200).json(insight);
  } catch (error) {
    next(error);
  }
};

export const getInsightHistory = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const insights = await WeeklyInsight.find({ organization: orgId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await WeeklyInsight.countDocuments({ organization: orgId });

    res.status(200).json({
      insights,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    next(error);
  }
};

export const triggerManualGeneration = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const insight = await generateInsight(orgId, startDate, endDate);
    if (!insight) {
      return res
        .status(404)
        .json({ message: "No meetings found in the past 7 days to analyze." });
    }
    res.status(201).json(insight);
  } catch (error) {
    next(error);
  }
};
