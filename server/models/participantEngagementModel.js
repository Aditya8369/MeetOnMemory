import mongoose from "mongoose";

const trendDataPointSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    score: { type: Number, required: true },
    period: { type: String, enum: ["day", "week", "month"], default: "week" },
  },
  { _id: false },
);

const participantEngagementSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    overallScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    dimensionalScores: {
      speaking: { type: Number, default: 0, min: 0, max: 100 },
      actionItems: { type: Number, default: 0, min: 0, max: 100 },
      decisions: { type: Number, default: 0, min: 0, max: 100 },
      attendance: { type: Number, default: 0, min: 0, max: 100 },
      aiQuality: { type: Number, default: 0, min: 0, max: 100 },
    },
    historicalTrends: {
      type: [trendDataPointSchema],
      default: [],
    },
    aiInsights: {
      strengths: { type: [String], default: [] },
      growthAreas: { type: [String], default: [] },
      lastGeneratedAt: { type: Date, default: null },
    },
    metrics: {
      meetingsAttended: { type: Number, default: 0 },
      totalSpeakingTimeMinutes: { type: Number, default: 0 },
      actionItemsCompleted: { type: Number, default: 0 },
      actionItemsAssigned: { type: Number, default: 0 },
      decisionsInvolved: { type: Number, default: 0 },
    },
    lastCalculatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Compound unique index to ensure one scorecard per user per organization
participantEngagementSchema.index(
  { userId: 1, organizationId: 1 },
  { unique: true },
);
// Index for fetching organization leaderboards efficiently
participantEngagementSchema.index({ organizationId: 1, overallScore: -1 });

const ParticipantEngagement =
  mongoose.models.ParticipantEngagement ||
  mongoose.model("ParticipantEngagement", participantEngagementSchema);

export default ParticipantEngagement;
