import mongoose from "mongoose";

const actionItemSchema = new mongoose.Schema(
  {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "", maxlength: 2000 },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deadline: { type: Date, default: null },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "overdue", "cancelled"],
      default: "pending",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    sourceContext: { type: String, default: "" },
    completedAt: { type: Date, default: null },
    remindersSent: [
      {
        type: {
          type: String,
          enum: ["7_day", "3_day", "1_day", "due_today", "overdue"],
        },
        sentAt: { type: Date, default: Date.now },
      },
    ],
    aiConfidence: { type: Number, default: 1.0 },
  },
  { timestamps: true },
);

// Compound indexes for efficient dashboard queries
actionItemSchema.index({ assignee: 1, status: 1 });
actionItemSchema.index({ deadline: 1, status: 1 });

// Removed pre('save') hook to ensure logic runs on insertMany and findByIdAndUpdate
// State transitions are now handled explicitly in the controller.

const ActionItem =
  mongoose.models.ActionItem || mongoose.model("ActionItem", actionItemSchema);
export default ActionItem;
