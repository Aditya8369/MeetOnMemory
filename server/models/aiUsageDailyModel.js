import mongoose from "mongoose";

/**
 * Per-org daily AI usage aggregates (Issue #2083).
 * Stores counters only — never prompt/transcript contents.
 */
const aiUsageDailySchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    /** UTC calendar day as YYYY-MM-DD */
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    geminiRequests: { type: Number, default: 0, min: 0 },
    geminiErrors: { type: Number, default: 0, min: 0 },
    promptTokens: { type: Number, default: 0, min: 0 },
    completionTokens: { type: Number, default: 0, min: 0 },
    totalTokens: { type: Number, default: 0, min: 0 },
    embeddingRequests: { type: Number, default: 0, min: 0 },
    embeddingErrors: { type: Number, default: 0, min: 0 },
    /** Character volume embedded (local MiniLM); not prompt text. */
    embeddingChars: { type: Number, default: 0, min: 0 },
    estimatedCostUsd: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

aiUsageDailySchema.index({ organization: 1, date: 1 }, { unique: true });

const AiUsageDaily = mongoose.model("AiUsageDaily", aiUsageDailySchema);

export default AiUsageDaily;
