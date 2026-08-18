import mongoose from "mongoose";

const MAX_KEYWORDS = 50;
const MAX_KEYWORD_LENGTH = 50;

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
      type: [
        {
          type: String,
          maxlength: [
            MAX_KEYWORD_LENGTH,
            `Keyword cannot exceed ${MAX_KEYWORD_LENGTH} characters`,
          ],
          trim: true,
        },
      ],
      validate: [
        {
          validator: (arr) => arr.length <= MAX_KEYWORDS,
          message: `Watchlist cannot exceed ${MAX_KEYWORDS} keywords`,
        },
      ],
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
