import mongoose from "mongoose";

/**
 * @desc Tracks real-time presence and cursor positions of users in a collaborative note.
 * This is ephemeral data but stored briefly to allow reconnecting users to see
 * the last known state of other participants before their WebSocket reconnects.
 */
const notePresenceSchema = new mongoose.Schema(
  {
    noteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CollaborativeNote",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userColor: {
      type: String,
      required: true, // Hex color for cursor and avatar border
    },
    // Current cursor position and selection range in the Yjs document
    cursorPosition: {
      anchor: Number,
      head: Number,
    },
    // Timestamp of the last activity to clean up stale connections
    lastSeen: {
      type: Date,
      default: Date.now,
      index: { expires: "5m" }, // TTL index: automatically delete after 5 minutes of inactivity
    },
  },
  {
    timestamps: false, // No need for createdAt/updatedAt for ephemeral presence
  },
);

// Compound index to ensure one presence record per user per note
notePresenceSchema.index({ noteId: 1, userId: 1 }, { unique: true });

export default mongoose.model("NotePresence", notePresenceSchema);
