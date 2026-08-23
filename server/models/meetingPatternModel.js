import mongoose from "mongoose";

const meetingPatternSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    type: {
      type: String, // e.g., "overtime_trend", "declining_attendance", "agenda_bloat", "stale_action_items"
      required: true,
    },
    category: {
      type: String,
      enum: ["anti_pattern", "positive_pattern"],
      required: true,
    },
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "info",
    },
    affectedMeetings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Meeting",
      },
    ],
    metadata: {
      type: mongoose.Schema.Types.Mixed, // e.g., { slope: -2.5, consecutiveMeetings: 4 }
      default: {},
    },
    aiRecommendation: {
      type: String, // AI-generated actionable advice
      default: "",
    },
    status: {
      type: String,
      enum: ["active", "acknowledged", "dismissed"],
      default: "active",
      index: true,
    },
    actionHistory: [
      {
        actionType: {
          type: String,
          enum: [
            "task_created",
            "rule_configured",
            "acknowledged",
            "dismissed",
          ],
          required: true,
        },
        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        performedByName: {
          type: String,
          default: "Admin",
        },
        details: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
        performedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    expiresAt: {
      type: Date,
      // The `expires` parameter tells MongoDB to automatically delete documents
      // when `expiresAt` is reached. The default is 90 days from creation.
      default: () => Date.now() + 90 * 24 * 60 * 60 * 1000,
    },
  },
  { timestamps: true },
);

// TTL index
meetingPatternSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for finding active patterns in an org
meetingPatternSchema.index({ organization: 1, status: 1 });

const MeetingPattern = mongoose.model("MeetingPattern", meetingPatternSchema);
export default MeetingPattern;
