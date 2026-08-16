import mongoose from "mongoose";

const actionItemDependencySchema = new mongoose.Schema(
  {
    dependentItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ActionItem",
      required: true,
    },
    blockedByItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ActionItem",
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
  },
  { timestamps: true },
);

// Compound unique index to prevent duplicate dependencies
actionItemDependencySchema.index(
  { dependentItem: 1, blockedByItem: 1 },
  { unique: true },
);

// Prevent self-referencing dependencies
actionItemDependencySchema.pre("save", function (next) {
  if (this.dependentItem.equals(this.blockedByItem)) {
    return next(new Error("An action item cannot block itself"));
  }
  next();
});

const ActionItemDependency =
  mongoose.models.ActionItemDependency ||
  mongoose.model("ActionItemDependency", actionItemDependencySchema);

export default ActionItemDependency;
