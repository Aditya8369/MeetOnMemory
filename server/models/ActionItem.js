const mongoose = require("mongoose");

/**
 * @desc Schema for tracking action items extracted from meeting transcripts.
 * Supports AI auto-assignment, deadlines, status tracking, and reminder history.
 */
const actionItemSchema = new mongoose.Schema(
  {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
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
      default: "",
      maxlength: 2000,
    },
    // The user responsible for completing the task
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // Can be unassigned initially if AI is ambiguous
    },
    // The user who created/extracted the action item
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deadline: {
      type: Date,
      default: null,
    },
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
    // Transcript snippet where this action item was mentioned
    sourceContext: {
      type: String,
      default: "",
    },
    completedAt: {
      type: Date,
      default: null,
    },
    // Track when reminders were sent to prevent spam
    remindersSent: [
      {
        type: {
          type: String,
          enum: ["7_day", "3_day", "1_day", "due_today", "overdue"],
        },
        sentAt: { type: Date, default: Date.now },
      },
    ],
    // AI confidence score (0-1) for the extraction accuracy
    aiConfidence: {
      type: Number,
      default: 1.0,
    },
  },
  {
    timestamps: true,
  },
);

// Compound indexes for efficient dashboard queries
actionItemSchema.index({ assignee: 1, status: 1 });
actionItemSchema.index({ deadline: 1, status: 1 });

// Middleware to auto-mark as overdue if deadline passes
actionItemSchema.pre("save", function (next) {
  if (
    this.deadline &&
    this.status !== "completed" &&
    this.status !== "cancelled"
  ) {
    if (new Date() > this.deadline && this.status !== "overdue") {
      this.status = "overdue";
    }
  }

  // Track completion timestamp
  if (
    this.isModified("status") &&
    this.status === "completed" &&
    !this.completedAt
  ) {
    this.completedAt = new Date();
  }

  next();
});

module.exports = mongoose.model("ActionItem", actionItemSchema);
