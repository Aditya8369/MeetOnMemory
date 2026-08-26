import mongoose from "mongoose";

const meetingNudgeSchema = new mongoose.Schema(
  {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
      index: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },
    nudgeType: {
      type: String,
      enum: ["UNRESOLVED_ACTION_ITEMS", "AGENDA_REVIEW", "GENERAL_PREP"],
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "SENT", "DISMISSED", "ACTED_ON"],
      default: "PENDING",
      index: true,
    },
    context: {
      type: mongoose.Schema.Types.Mixed, // e.g., { unresolvedCount: 3, relatedActionItems: ['id1', 'id2'] }
      default: {},
    },
    readinessScore: {
      type: Number, // 0 to 100
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

meetingNudgeSchema.index(
  { meetingId: 1, recipientId: 1, nudgeType: 1 },
  { unique: true },
);

const MeetingNudge =
  mongoose.models.MeetingNudge ||
  mongoose.model("MeetingNudge", meetingNudgeSchema);

export default MeetingNudge;
