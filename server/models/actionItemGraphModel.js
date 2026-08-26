import mongoose from "mongoose";

const ActionItemDependencySchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    sourceMeetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
      index: true,
    },
    targetMeetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      index: true,
    },
    sourceActionItemId: {
      type: String,
      required: true,
      index: true,
    },
    targetActionItemId: {
      type: String,
      required: true,
      index: true,
    },
    dependencyType: {
      type: String,
      enum: ["BLOCKS", "DEPENDS_ON", "RELATES_TO", "PARENT_OF"],
      default: "BLOCKS",
    },
    criticalPathWeight: {
      type: Number,
      default: 1,
      min: 1,
      max: 10,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "RESOLVED", "WAIVED"],
      default: "ACTIVE",
    },
    escalationLevel: {
      type: Number,
      default: 0,
      min: 0,
      max: 3,
    },
    lastEscalatedAt: {
      type: Date,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

ActionItemDependencySchema.index(
  { organizationId: 1, sourceActionItemId: 1, targetActionItemId: 1 },
  { unique: true },
);

const ActionItemGraph = mongoose.model(
  "ActionItemGraph",
  ActionItemDependencySchema,
);

export default ActionItemGraph;
