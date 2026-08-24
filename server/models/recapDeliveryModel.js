import mongoose from "mongoose";

const recapDeliverySchema = new mongoose.Schema(
  {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deliveredAt: {
      type: Date,
      default: Date.now,
    },
    // Issue #2069 — ops triage for failed deliveries
    status: {
      type: String,
      enum: ["delivered", "failed", "pending"],
      default: "delivered",
      index: true,
    },
    channel: {
      type: String,
      enum: ["email", "webhook", "in_app"],
      default: "email",
    },
    errorMessage: {
      type: String,
      maxlength: 500,
      default: null,
    },
  },
  { timestamps: true },
);

// Prevent duplicate deliveries for the same meeting to the same user
recapDeliverySchema.index({ meetingId: 1, userId: 1 }, { unique: true });

export default mongoose.model("RecapDelivery", recapDeliverySchema);
