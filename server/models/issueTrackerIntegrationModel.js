import mongoose from "mongoose";

const issueTrackerIntegrationSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    provider: {
      type: String,
      enum: ["jira", "linear"],
      required: true,
    },
    accessToken: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
      default: null,
    },
    webhookSecret: {
      type: String,
      default: null, // used to verify incoming webhooks
    },
    config: {
      // provider-specific config like default projectId or teamId
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    connectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

// Allow one integration per provider per organization
issueTrackerIntegrationSchema.index(
  { organization: 1, provider: 1 },
  { unique: true },
);

const IssueTrackerIntegration =
  mongoose.models.IssueTrackerIntegration ||
  mongoose.model("IssueTrackerIntegration", issueTrackerIntegrationSchema);

export default IssueTrackerIntegration;
