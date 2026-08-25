import mongoose from "mongoose";

const meetingRiskSchema = new mongoose.Schema(
  {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      enum: [
        "Technical",
        "Schedule",
        "Financial",
        "Resource",
        "Operational",
        "Compliance",
        "Other",
      ],
      default: "Other",
    },
    probability: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      default: 3,
    },
    impact: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      default: 3,
    },
    riskScore: {
      type: Number,
      required: true,
      default: 9, // Default 3x3
    },
    status: {
      type: String,
      enum: ["Open", "Mitigated", "Closed", "Realized"],
      default: "Open",
    },
    mitigationPlan: {
      type: String,
      trim: true,
      default: "",
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    actionItemIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ActionItem",
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

meetingRiskSchema.index({ organizationId: 1, status: 1 });
meetingRiskSchema.index({ meetingId: 1, status: 1 });

export default mongoose.model("MeetingRisk", meetingRiskSchema);
