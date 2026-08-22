import DecisionLogEntry from "../models/decisionLogEntryModel.js";
import mongoose from "mongoose";

class DecisionLogService {
  async createEntry(data) {
    const entry = new DecisionLogEntry(data);
    await entry.save();
    return entry;
  }

  async getLogByOrg(organizationId, options = {}) {
    const {
      page = 1,
      limit = 20,
      outcome,
      sortBy = "createdAt",
      sortOrder = -1,
    } = options;
    const query = {
      organizationId: new mongoose.Types.ObjectId(organizationId),
    };

    if (outcome) {
      query.outcome = outcome;
    }

    const skip = (page - 1) * limit;

    const entries = await DecisionLogEntry.find(query)
      .populate("decisionId", "text owner status resolvedAt")
      .populate("meetingId", "title date")
      .populate("decidedBy", "name email")
      .populate("linkedActionItems", "text status dueDate")
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit);

    const total = await DecisionLogEntry.countDocuments(query);

    return {
      entries,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateOutcome(entryId, outcome, impactAssessment) {
    const updateData = { outcome };
    if (impactAssessment !== undefined) {
      updateData.impactAssessment = impactAssessment;
    }

    const entry = await DecisionLogEntry.findByIdAndUpdate(
      entryId,
      { $set: updateData },
      { new: true },
    )
      .populate("decisionId")
      .populate("meetingId")
      .populate("decidedBy")
      .populate("linkedActionItems");

    if (!entry) {
      throw new Error("Decision Log Entry not found");
    }
    return entry;
  }

  async linkActionItems(entryId, actionItemIds) {
    const entry = await DecisionLogEntry.findByIdAndUpdate(
      entryId,
      {
        $addToSet: {
          linkedActionItems: {
            $each: actionItemIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
        },
      },
      { new: true },
    ).populate("linkedActionItems");

    if (!entry) {
      throw new Error("Decision Log Entry not found");
    }
    return entry;
  }

  async getDecisionTimeline(organizationId) {
    const timeline = await DecisionLogEntry.aggregate([
      {
        $match: {
          organizationId: new mongoose.Types.ObjectId(organizationId),
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            outcome: "$outcome",
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ]);

    // Format for easier consumption by frontend
    const formattedTimeline = timeline.reduce((acc, curr) => {
      const monthYear = `${curr._id.year}-${curr._id.month.toString().padStart(2, "0")}`;
      if (!acc[monthYear]) {
        acc[monthYear] = { monthYear };
      }
      acc[monthYear][curr._id.outcome] = curr.count;
      return acc;
    }, {});

    return Object.values(formattedTimeline);
  }

  async getOverdueReviews(organizationId) {
    const today = new Date();
    const entries = await DecisionLogEntry.find({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      reviewDate: { $ne: null, $lt: today },
    })
      .populate("decisionId")
      .populate("meetingId")
      .populate("decidedBy")
      .sort({ reviewDate: 1 });

    return entries;
  }
}

export default new DecisionLogService();
