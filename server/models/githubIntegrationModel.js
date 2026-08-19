import mongoose from "mongoose";

const githubIntegrationSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      unique: true,
    },
    accessToken: {
      type: String,
      required: true,
    },
    repositoryFullName: {
      type: String,
      required: true,
      trim: true,
    },
    connectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

githubIntegrationSchema.index({ organization: 1 });

const GithubIntegration =
  mongoose.models.GithubIntegration ||
  mongoose.model("GithubIntegration", githubIntegrationSchema);

export default GithubIntegration;
