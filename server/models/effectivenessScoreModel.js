import mongoose from "mongoose";

const effectivenessScoreSchema = new mongoose.Schema(
  {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
      unique: true,
    },
    seriesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MeetingSeries",
      default: null,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    overallScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    dimensions: {
      goalCompletionRate: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: 0,
      },
      actionItemFollowThrough: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: 0,
      },
      participantSatisfaction: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: 0,
      },
      decisionClarity: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: 0,
      },
      timeEfficiency: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: 0,
      },
    },
  },
  { timestamps: true },
);

effectivenessScoreSchema.index({ meetingId: 1 });
effectivenessScoreSchema.index({ seriesId: 1 });
effectivenessScoreSchema.index({ organizationId: 1 });

const EffectivenessScore = mongoose.model(
  "EffectivenessScore",
  effectivenessScoreSchema,
);

export default EffectivenessScore;
