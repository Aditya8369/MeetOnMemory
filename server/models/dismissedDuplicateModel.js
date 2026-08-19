import mongoose from "mongoose";

const dismissedDuplicateSchema = new mongoose.Schema(
  {
    meetingA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
    },
    meetingB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
    },
    dismissedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

// Prevent re-suggesting in either direction
dismissedDuplicateSchema.index({ meetingA: 1, meetingB: 1 }, { unique: true });

const DismissedDuplicate = mongoose.model(
  "DismissedDuplicate",
  dismissedDuplicateSchema,
);

export default DismissedDuplicate;
