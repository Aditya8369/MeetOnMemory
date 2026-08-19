import mongoose from "mongoose";

const escalationStepSchema = new mongoose.Schema(
  {
    delayHours: {
      type: Number,
      required: true,
      min: 0,
      description: "Hours after the due date when this step triggers",
    },
    actionType: {
      type: String,
      enum: ["notify", "reassign"],
      required: true,
    },
    targetRole: {
      type: String,
      enum: ["owner", "manager", "org_admin", "backupOwner"],
      required: true,
      description: "Role or user type to notify or assign to",
    },
    backupOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      description:
        "Specific user to assign if actionType is reassign and targetRole is backupOwner",
    },
  },
  { _id: true },
);

const escalationPolicySchema = new mongoose.Schema(
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
    description: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    steps: {
      type: [escalationStepSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

const EscalationPolicy =
  mongoose.models.EscalationPolicy ||
  mongoose.model("EscalationPolicy", escalationPolicySchema);

export default EscalationPolicy;
