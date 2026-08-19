// server/models/escalationPolicyModel.js
import mongoose from "mongoose";

const escalationPolicySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Policy name is required"],
      trim: true,
      maxlength: [150, "Policy name cannot exceed 150 characters"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    rules: [
      {
        step: { type: Number, default: 1 },
        delayMinutes: { type: Number, default: 15 },
        targetRole: { type: String, default: "" },
        targetUser: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        notifyChannel: { type: String, default: "email" },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
  },
  { timestamps: true },
);

// Indexes for fast tenant-scoped queries
escalationPolicySchema.index({ organization: 1, createdAt: -1 });

const EscalationPolicy =
  mongoose.models.EscalationPolicy ||
  mongoose.model("EscalationPolicy", escalationPolicySchema);

export default EscalationPolicy;
