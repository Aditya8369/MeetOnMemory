import mongoose from "mongoose";

const customFieldValueSchema = new mongoose.Schema(
  {
    meeting: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
      index: true,
    },
    fieldDefinition: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomFieldDefinition",
      required: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true },
);

// Ensure one value per meeting/fieldDefinition combination
customFieldValueSchema.index(
  { meeting: 1, fieldDefinition: 1 },
  { unique: true },
);

const CustomFieldValue = mongoose.model(
  "CustomFieldValue",
  customFieldValueSchema,
);

export default CustomFieldValue;
