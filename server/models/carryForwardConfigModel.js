import mongoose from "mongoose";

const carryForwardConfigSchema = new mongoose.Schema(
  {
    seriesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MeetingSeries",
      required: true,
      unique: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },
    carryForwardRules: {
      includeUnfinishedAgenda: {
        type: Boolean,
        default: true,
      },
      includeOpenActionItems: {
        type: Boolean,
        default: true,
      },
      maxCarriedItems: {
        type: Number,
        default: 10,
        min: 1,
        max: 50,
      },
    },
  },
  { timestamps: true },
);

carryForwardConfigSchema.index({ organization: 1 });

const CarryForwardConfig = mongoose.model(
  "CarryForwardConfig",
  carryForwardConfigSchema,
);

export default CarryForwardConfig;
