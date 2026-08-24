import mongoose from "mongoose";

const physicalResourceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["room", "equipment", "catering"],
      required: true,
    },
    capacity: {
      type: Number,
      default: 0,
    },
    location: {
      type: String,
      default: "",
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
  },
  { timestamps: true },
);

physicalResourceSchema.index({ organization: 1, type: 1 });

const PhysicalResource = mongoose.model(
  "PhysicalResource",
  physicalResourceSchema,
);
export default PhysicalResource;
