import mongoose from "mongoose";

const keywordAlertSchema = new mongoose.Schema(
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
    keywords: {
      type: [String],
      default: [],
    },
    notifyViaEmail: {
      type: Boolean,
      default: true,
    },
    notifyViaApp: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Ensure only one alert settings document per user per organization
keywordAlertSchema.index({ user: 1, organization: 1 }, { unique: true });

const KeywordAlert = mongoose.model("KeywordAlert", keywordAlertSchema);

export default KeywordAlert;
