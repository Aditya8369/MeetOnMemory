import mongoose from "mongoose";

const standupPreferenceSchema = new mongoose.Schema(
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
    scheduleType: {
      type: String,
      enum: ["daily", "weekly", "none"],
      default: "daily",
    },
    timeOfDay: {
      type: String,
      default: "09:00", // e.g., "09:00" format in local/user tz (for simplicity, server uses this as UTC or we could interpret it if we add tz support)
    },
    deliveryChannels: [
      {
        type: String,
        enum: ["email", "slack", "in-app"],
      },
    ],
  },
  { timestamps: true },
);

// Ensure one preference per user per organization
standupPreferenceSchema.index({ user: 1, organization: 1 }, { unique: true });

export default mongoose.model("StandupPreference", standupPreferenceSchema);
