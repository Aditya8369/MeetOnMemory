import mongoose from "mongoose";

const guestAccessTokenSchema = new mongoose.Schema(
  {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
      index: true,
    },
    guestEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    permissions: [
      {
        type: String,
        enum: [
          "view_transcript",
          "view_summary",
          "view_action_items",
          "add_comments",
        ],
      },
    ],
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index
    },
    maxViews: {
      type: Number,
      default: 0, // 0 means unlimited
    },
    currentViews: {
      type: Number,
      default: 0,
    },
    revoked: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("GuestAccessToken", guestAccessTokenSchema);
