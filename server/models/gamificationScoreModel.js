import mongoose from "mongoose";

const gamificationScoreSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    totalPoints: {
      type: Number,
      default: 0,
    },
    history: [
      {
        event: {
          type: String, // e.g. "MEETING_ENDED_ON_TIME", "ACTION_ITEM_COMPLETED_EARLY"
          required: true,
        },
        pointsAwarded: {
          type: Number,
          required: true,
        },
        metadata: {
          // Store meetingId or actionItemId relevant to this score
          type: mongoose.Schema.Types.Mixed,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    unlockedBadges: [
      {
        badge: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Badge",
        },
        unlockedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true },
);

// Ensure one score doc per user per org
gamificationScoreSchema.index({ user: 1, organization: 1 }, { unique: true });

const GamificationScore =
  mongoose.models.GamificationScore ||
  mongoose.model("GamificationScore", gamificationScoreSchema);

export default GamificationScore;
