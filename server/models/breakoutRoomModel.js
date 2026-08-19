import mongoose from "mongoose";

const breakoutRoomSchema = new mongoose.Schema(
  {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "active", "closed"],
      default: "pending",
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    notes: {
      type: String,
      default: "",
    },
    transcript: [
      {
        speakerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        speakerName: { type: String, default: "Unknown" },
        text: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    summary: {
      type: String,
      default: "",
    },
    startTime: {
      type: Date,
    },
    closeTime: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for faster querying
breakoutRoomSchema.index({ meetingId: 1, status: 1 });

const BreakoutRoom = mongoose.model("BreakoutRoom", breakoutRoomSchema);
export default BreakoutRoom;
