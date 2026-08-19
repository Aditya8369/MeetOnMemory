import mongoose from "mongoose";

/**
 * Persistent mapping between internal ActionItems and GitHub Issues (Issue #1600).
 *
 * Stores enough context to:
 * 1. Prevent duplicate GitHub Issues for the same action item.
 * 2. Scope webhook lookups to a specific repo (issue numbers are per-repo).
 * 3. Track last sync direction for conflict resolution.
 */
const githubIssueSyncSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    actionItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ActionItem",
      required: true,
    },
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      default: null,
    },
    repositoryFullName: {
      type: String,
      required: true,
      trim: true,
    },
    githubIssueNumber: {
      type: Number,
      required: true,
    },
    githubIssueNodeId: {
      type: String,
      default: null,
    },
    githubIssueUrl: {
      type: String,
      required: true,
    },
    lastSyncDirection: {
      type: String,
      enum: ["push", "webhook"],
      default: "push",
    },
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

githubIssueSyncSchema.index(
  { organization: 1, actionItem: 1, repositoryFullName: 1 },
  { unique: true },
);

githubIssueSyncSchema.index(
  { repositoryFullName: 1, githubIssueNumber: 1 },
  { unique: true },
);

const GitHubIssueSync =
  mongoose.models.GitHubIssueSync ||
  mongoose.model("GitHubIssueSync", githubIssueSyncSchema);

export default GitHubIssueSync;
