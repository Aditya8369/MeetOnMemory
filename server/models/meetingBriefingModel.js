import mongoose from "mongoose";

const meetingBriefingSchema = new mongoose.Schema(
  {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "generated", "failed"],
      default: "pending",
    },
    executiveSummary: { type: String, default: "" },
    relatedPastMeetings: { type: mongoose.Schema.Types.Mixed, default: [] },
    openActionItems: { type: mongoose.Schema.Types.Mixed, default: [] },
    carryForwardItems: { type: mongoose.Schema.Types.Mixed, default: [] },
    suggestedQuestions: { type: [String], default: [] },
    generatedAt: { type: Date, default: null },
    errorMessage: { type: String, default: null },
  },
  { timestamps: true },
);

meetingBriefingSchema.index({ meetingId: 1 }, { unique: true });

const MeetingBriefing =
  mongoose.models.MeetingBriefing ||
  mongoose.model("MeetingBriefing", meetingBriefingSchema);
export default MeetingBriefing;
