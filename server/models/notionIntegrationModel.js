import mongoose from "mongoose";

const notionIntegrationSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
      unique: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    accessToken: {
      type: String,
      required: true,
    },
    workspaceId: {
      type: String,
      required: true,
    },
    workspaceName: {
      type: String,
    },
    targetDatabaseId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const NotionIntegration = mongoose.model(
  "NotionIntegration",
  notionIntegrationSchema,
);

export default NotionIntegration;
