import mongoose from "mongoose";

const customFieldDefinitionSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["text", "number", "dropdown", "date", "checkbox"],
      required: true,
    },
    options: {
      type: [String],
      default: undefined,
    },
    required: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Ensure name is unique per organization
customFieldDefinitionSchema.index(
  { organization: 1, name: 1 },
  { unique: true },
);

const CustomFieldDefinition = mongoose.model(
  "CustomFieldDefinition",
  customFieldDefinitionSchema,
);

export default CustomFieldDefinition;
