import mongoose from "mongoose";

const actionItemSlaBreachSchema = new mongoose.Schema(
  {
    actionItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ActionItem",
      required: true,
      index: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      required: true,
    },
    breachType: {
      type: String,
      enum: ["response", "resolution"],
      required: true,
    },
    targetHours: {
      type: Number,
      required: true,
    },
    actualHours: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["open", "acknowledged"],
      default: "open",
      index: true,
    },
    acknowledgedAt: {
      type: Date,
      default: null,
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Prevent duplicate breaches of the same type for the same action item
actionItemSlaBreachSchema.index(
  { actionItem: 1, breachType: 1 },
  { unique: true },
);

const ActionItemSlaBreach =
  mongoose.models.ActionItemSlaBreach ||
  mongoose.model("ActionItemSlaBreach", actionItemSlaBreachSchema);

export default ActionItemSlaBreach;
