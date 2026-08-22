import mongoose from "mongoose";

const decisionLogEntrySchema = new mongoose.Schema(
  {
    decisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Decision",
      required: true,
    },
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    outcome: {
      type: String,
      enum: ["implemented", "reversed", "deferred", "pending", "superseded"],
      default: "pending",
    },
    impactAssessment: {
      type: String,
      default: "",
    },
    linkedActionItems: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ActionItem",
      },
    ],
    reviewDate: {
      type: Date,
      default: null,
    },
    tags: [
      {
        type: String,
      },
    ],
  },
  { timestamps: true },
);

const DecisionLogEntry =
  mongoose.models.DecisionLogEntry ||
  mongoose.model("DecisionLogEntry", decisionLogEntrySchema);

export default DecisionLogEntry;
