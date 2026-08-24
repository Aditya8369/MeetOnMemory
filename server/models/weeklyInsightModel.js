import mongoose from "mongoose";

const weeklyInsightSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    aiSummary: {
      type: String,
      default: "",
    },
    recurringTopics: [
      {
        name: { type: String, required: true },
        description: { type: String, default: "" },
        meetingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Meeting" }],
      },
    ],
    stalledActionItems: [
      {
        actionItem: { type: mongoose.Schema.Types.ObjectId, ref: "ActionItem" },
        text: { type: String, required: true },
        meetingId: { type: mongoose.Schema.Types.ObjectId, ref: "Meeting" },
      },
    ],
    decisionConflicts: [
      {
        description: { type: String, required: true },
        relatedMeetings: [
          { type: mongoose.Schema.Types.ObjectId, ref: "Meeting" },
        ],
      },
    ],
    participationTrends: {
      type: String,
      default: "",
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

weeklyInsightSchema.index({ organization: 1, createdAt: -1 });

export default mongoose.model("WeeklyInsight", weeklyInsightSchema);
