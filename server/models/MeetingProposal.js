import mongoose from "mongoose";

/**
 * Meeting scheduling proposals (Smart Scheduler).
 * Tracks organizer, org scope, proposed slots, and confirmation linkage.
 */
const meetingProposalSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
      index: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
    ],
    duration: {
      type: Number, // minutes
      required: true,
      default: 30,
    },
    dateRange: {
      start: { type: Date, required: true },
      end: { type: Date, required: true },
    },
    proposedSlots: [
      {
        startTime: { type: Date, required: true },
        endTime: { type: Date, required: true },
        score: { type: Number, default: 0 },
        conflicts: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
        attendeeCount: { type: Number, default: 0 },
      },
    ],
    selectedSlot: {
      startTime: Date,
      endTime: Date,
    },
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      default: null,
    },
    status: {
      type: String,
      enum: ["draft", "proposed", "confirmed", "cancelled"],
      default: "draft",
    },
    preferences: {
      preferredTimes: [
        { type: String, enum: ["morning", "afternoon", "evening"] },
      ],
      avoidWeekends: { type: Boolean, default: true },
      bufferTime: { type: Number, default: 15 },
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true },
);

meetingProposalSchema.index({ organizer: 1, status: 1 });
meetingProposalSchema.index({ organization: 1, status: 1 });
meetingProposalSchema.index({ participants: 1, status: 1 });

const MeetingProposal =
  mongoose.models.MeetingProposal ||
  mongoose.model("MeetingProposal", meetingProposalSchema);

export default MeetingProposal;
