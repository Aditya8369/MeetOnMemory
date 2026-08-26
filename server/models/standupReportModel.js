import mongoose from "mongoose";

const standupReportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["daily", "weekly"],
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    aiSummary: {
      type: String,
      default: "",
    },
    completedActionItems: [
      {
        actionItem: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ActionItem",
        },
        text: { type: String, required: true },
        meetingId: { type: mongoose.Schema.Types.ObjectId, ref: "Meeting" },
      },
    ],
    upcomingActionItems: [
      {
        actionItem: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ActionItem",
        },
        text: { type: String, required: true },
        dueDate: { type: Date },
        meetingId: { type: mongoose.Schema.Types.ObjectId, ref: "Meeting" },
      },
    ],
    blockers: [
      {
        actionItem: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ActionItem",
        },
        text: { type: String, required: true },
        meetingId: { type: mongoose.Schema.Types.ObjectId, ref: "Meeting" },
      },
    ],
    attendedMeetings: [
      {
        meeting: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Meeting",
        },
        title: { type: String, required: true },
        date: { type: Date },
      },
    ],
    decisions: [
      {
        description: { type: String, required: true },
        meetingId: { type: mongoose.Schema.Types.ObjectId, ref: "Meeting" },
      },
    ],
  },
  { timestamps: true },
);

standupReportSchema.index({ user: 1, organization: 1, date: -1 });

export default mongoose.model("StandupReport", standupReportSchema);
