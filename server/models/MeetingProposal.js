const mongoose = require("mongoose");

/**
 * @desc Schema for storing meeting scheduling proposals and selected time slots.
 * Tracks the organizer, participants, proposed slots with scores, and final confirmation.
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
      ref: "User",
      required: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    duration: {
      type: Number, // in minutes
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
        score: { type: Number, default: 0 }, // 0-100 optimality score
        conflicts: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Users who are busy
        attendeeCount: { type: Number, default: 0 },
      },
    ],
    selectedSlot: {
      startTime: Date,
      endTime: Date,
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
      bufferTime: { type: Number, default: 15 }, // minutes between meetings
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  },
  {
    timestamps: true,
  },
);

// Index for fetching proposals by organizer or participant
meetingProposalSchema.index({ organizer: 1, status: 1 });
meetingProposalSchema.index({ participants: 1, status: 1 });

module.exports = mongoose.model("MeetingProposal", meetingProposalSchema);
