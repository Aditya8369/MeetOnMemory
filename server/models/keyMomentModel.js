import mongoose from "mongoose";

const keyMomentSchema = new mongoose.Schema(
  {
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
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    snippet: {
      type: String,
      maxlength: 500,
      required: true,
    },
    startTime: {
      type: Number, // in seconds
      required: true,
    },
    endTime: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      enum: ["decision", "action_item", "insight", "question", "disagreement"],
      required: true,
    },
    note: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

// Compound unique index for ensuring a user doesn't create duplicate moments at the exact same time
keyMomentSchema.index(
  { meetingId: 1, userId: 1, startTime: 1 },
  { unique: true },
);

// Index for quickly fetching all moments for a meeting within an org
keyMomentSchema.index({ organization: 1, meetingId: 1 });

const KeyMoment = mongoose.model("KeyMoment", keyMomentSchema);

export default KeyMoment;
