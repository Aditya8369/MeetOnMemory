import mongoose from "mongoose";

/**
 * Tracks processed webhook deliveries for idempotency (Issue #1600).
 *
 * Each GitHub webhook carries a unique X-GitHub-Delivery header.
 * Storing it lets us silently skip duplicate/retried deliveries.
 *
 * A TTL index auto-purges entries after 7 days to keep the collection small.
 */
const webhookDeliveryLogSchema = new mongoose.Schema(
  {
    deliveryId: {
      type: String,
      required: true,
      unique: true,
    },
    provider: {
      type: String,
      enum: ["github"],
      required: true,
    },
    event: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      default: null,
    },
    processedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false },
);

webhookDeliveryLogSchema.index(
  { processedAt: 1 },
  { expireAfterSeconds: 7 * 24 * 60 * 60 },
);

const WebhookDeliveryLog =
  mongoose.models.WebhookDeliveryLog ||
  mongoose.model("WebhookDeliveryLog", webhookDeliveryLogSchema);

export default WebhookDeliveryLog;
