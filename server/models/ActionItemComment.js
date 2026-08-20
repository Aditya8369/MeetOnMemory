import mongoose from "mongoose";

export const MAX_ACTION_ITEM_COMMENT_LENGTH = 2000;

const actionItemCommentSchema = new mongoose.Schema(
  {
    actionItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ActionItem",
      required: true,
      index: true,
    },
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: [
        MAX_ACTION_ITEM_COMMENT_LENGTH,
        `Action item comment exceeds maximum length of ${MAX_ACTION_ITEM_COMMENT_LENGTH} characters`,
      ],
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ActionItemComment",
      default: null,
      index: true,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

actionItemCommentSchema.index({ actionItem: 1, createdAt: -1 });
actionItemCommentSchema.index({ meetingId: 1, createdAt: -1 });
actionItemCommentSchema.index({ parentComment: 1, createdAt: 1 });

const ActionItemComment =
  mongoose.models.ActionItemComment ||
  mongoose.model("ActionItemComment", actionItemCommentSchema);

export default ActionItemComment;
