import mongoose from "mongoose";

const dataRetentionPolicySchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      unique: true,
    },
    enabled: {
      type: Boolean,
      default: false,
    },
    retentionPeriodDays: {
      type: Number,
      default: 365,
      min: 1,
    },
    gracePeriodDays: {
      type: Number,
      default: 30,
      min: 0,
    },
    scope: {
      type: [String],
      enum: ["meetings", "transcripts", "summaries"],
      default: ["meetings", "transcripts", "summaries"],
    },
    exemptTags: {
      type: [String],
      default: [],
    },
    lastRunAt: {
      type: Date,
      default: null,
    },
    runHistory: [
      {
        runAt: { type: Date, default: Date.now },
        archivedCount: { type: Number, default: 0 },
        deletedCount: { type: Number, default: 0 },
        status: {
          type: String,
          enum: ["success", "failed"],
          default: "success",
        },
        error: { type: String, default: null },
      },
    ],
  },
  { timestamps: true },
);

const DataRetentionPolicy = mongoose.model(
  "DataRetentionPolicy",
  dataRetentionPolicySchema,
);

export default DataRetentionPolicy;
