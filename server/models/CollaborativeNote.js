import mongoose from "mongoose";

/**
 * @desc Mongoose schema for storing CRDT state and metadata for collaborative meeting notes.
 * The `yjsState` field stores the binary CRDT state as a Buffer, which allows for
 * conflict-free merging of concurrent edits across multiple clients.
 */
const collaborativeNoteSchema = new mongoose.Schema(
  {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
      unique: true,
      index: true,
    },
    // The binary state of the Yjs document
    yjsState: {
      type: Buffer,
      default: null,
    },
    // Plain text representation for search indexing and fallbacks
    plainTextContent: {
      type: String,
      default: "",
    },
    // Array of user IDs who have access to edit/view this note
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Versioning for snapshot history
    version: {
      type: Number,
      default: 1,
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    lastModifiedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Index for fast retrieval by meeting ID
collaborativeNoteSchema.index({ meetingId: 1 });

export default mongoose.model("CollaborativeNote", collaborativeNoteSchema);
