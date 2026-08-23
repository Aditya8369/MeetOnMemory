import mongoose from "mongoose";

const roleRotationSchema = new mongoose.Schema(
  {
    seriesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MeetingSeries",
      required: true,
    },
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["facilitator", "scribe", "timekeeper"],
      required: true,
    },
  },
  { timestamps: true },
);

// Index to efficiently look up history by series and user for LRU
roleRotationSchema.index({ seriesId: 1, role: 1, createdAt: -1 });
roleRotationSchema.index({ seriesId: 1, userId: 1, role: 1 });

const RoleRotation = mongoose.model("RoleRotation", roleRotationSchema);
export default RoleRotation;
