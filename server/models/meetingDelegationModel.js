import mongoose from "mongoose";

const meetingDelegationSchema = new mongoose.Schema(
  {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
      index: true,
    },
    delegatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    delegateeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "revoked", "completed"],
      default: "pending",
      index: true,
    },
    scope: [
      {
        type: String,
        enum: ["full", "action_items", "voting", "observation"],
      },
    ],
    contextBriefing: {
      type: String,
      default: "",
    },
    postMeetingReport: {
      type: String,
      default: "",
    },
    temporarilyDelegatedActionItems: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ActionItem",
      },
    ],
  },
  { timestamps: true },
);

meetingDelegationSchema.index(
  { delegatorId: 1, meetingId: 1 },
  { unique: true },
); // Only one delegation per meeting by a delegator

const MeetingDelegation =
  mongoose.models.MeetingDelegation ||
  mongoose.model("MeetingDelegation", meetingDelegationSchema);

export default MeetingDelegation;
