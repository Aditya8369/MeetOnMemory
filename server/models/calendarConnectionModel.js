import mongoose from "mongoose";

const calendarConnectionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    provider: {
      type: String,
      enum: ["google", "microsoft", "outlook"],
      required: true,
    },
    // Encrypted access token
    accessToken: {
      type: String,
      required: true,
    },
    // Encrypted refresh token
    refreshToken: {
      type: String,
      default: null,
    },
    // Token expiration timestamp
    tokenExpiresAt: {
      type: Date,
      default: null,
    },
    // Provider-specific data (e.g., calendar ID, email)
    providerData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Sync status
    syncStatus: {
      type: String,
      enum: ["connected", "needs_reauth", "error", "syncing"],
      default: "connected",
    },
    // Last sync timestamp
    lastSyncAt: {
      type: Date,
      default: null,
    },
    // Sync error message (if any)
    syncError: {
      type: String,
      default: null,
    },
    // Recent sync attempts for ops UI (Issue #2053)
    syncHistory: {
      type: [
        {
          at: { type: Date, default: Date.now },
          status: {
            type: String,
            enum: ["success", "error"],
            required: true,
          },
          message: { type: String, default: "" },
          syncedCount: { type: Number, default: 0 },
          trigger: {
            type: String,
            enum: ["manual", "cron"],
            default: "cron",
          },
        },
      ],
      default: [],
    },
    // Webhook subscription ID (for push notifications)
    webhookSubscriptionId: {
      type: String,
      default: null,
    },
    // Webhook expiration
    webhookExpiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// Index for efficient lookups
calendarConnectionSchema.index({ user: 1, provider: 1 }, { unique: true });
calendarConnectionSchema.index({ syncStatus: 1 });

const CalendarConnection = mongoose.model(
  "CalendarConnection",
  calendarConnectionSchema,
);

export default CalendarConnection;
