import mongoose from "mongoose";

const templateItemSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    description: { type: String, default: "", maxlength: 2000 },
    defaultOwnerRole: { type: String, default: "Unassigned" },
    daysToComplete: { type: Number, default: 7 },
  },
  { _id: true },
);

const actionItemTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [templateItemSchema],
    applicableMeetingTypes: {
      type: [String],
      default: [],
    },
    applicableSeriesIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MeetingSeries",
      },
    ],
  },
  { timestamps: true },
);

actionItemTemplateSchema.index({ organization: 1 });
actionItemTemplateSchema.index({ applicableMeetingTypes: 1 });
actionItemTemplateSchema.index({ applicableSeriesIds: 1 });

const ActionItemTemplate = mongoose.model(
  "ActionItemTemplate",
  actionItemTemplateSchema,
);

export default ActionItemTemplate;
