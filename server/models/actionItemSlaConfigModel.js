import mongoose from "mongoose";

const actionItemSlaConfigSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      unique: true,
    },
    targets: {
      low: {
        targetResponseHours: { type: Number, default: 72 },
        targetResolutionHours: { type: Number, default: 336 }, // 14 days
      },
      medium: {
        targetResponseHours: { type: Number, default: 48 },
        targetResolutionHours: { type: Number, default: 168 }, // 7 days
      },
      high: {
        targetResponseHours: { type: Number, default: 24 },
        targetResolutionHours: { type: Number, default: 72 }, // 3 days
      },
      urgent: {
        targetResponseHours: { type: Number, default: 4 },
        targetResolutionHours: { type: Number, default: 24 }, // 1 day
      },
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

const ActionItemSlaConfig =
  mongoose.models.ActionItemSlaConfig ||
  mongoose.model("ActionItemSlaConfig", actionItemSlaConfigSchema);

export default ActionItemSlaConfig;
