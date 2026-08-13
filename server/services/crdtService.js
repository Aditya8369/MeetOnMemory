const Y = require("yjs");
const CollaborativeNote = require("../models/CollaborativeNote");
const NoteSnapshot = require("../models/NoteSnapshot"); // Assumed existing model for history

/**
 * @desc Service layer for handling Yjs CRDT operations, state encoding/decoding,
 * and snapshot generation for version history.
 */
class CrdtService {
  /**
   * Initializes or retrieves a Yjs document for a specific meeting.
   * @param {string} meetingId - The ID of the meeting.
   * @param {string} initialContent - Fallback plain text if no CRDT state exists.
   * @returns {Promise<Y.Doc>} The initialized Yjs document.
   */
  static async getOrInitDocument(meetingId, initialContent = "") {
    const note = await CollaborativeNote.findOne({ meetingId });
    const ydoc = new Y.Doc();

    if (note && note.yjsState) {
      // Apply existing binary state to the new Yjs document
      Y.applyUpdate(ydoc, new Uint8Array(note.yjsState));
    } else {
      // Initialize with default content if it's a brand new document
      const ytext = ydoc.getText("collaborative-note");

      // Use a transaction to batch the initial insertion
      ydoc.transact(() => {
        ytext.insert(0, initialContent);
      });

      // Save the initial state to the database
      const encodedState = Y.encodeStateAsUpdate(ydoc);
      await CollaborativeNote.findOneAndUpdate(
        { meetingId },
        {
          meetingId,
          yjsState: Buffer.from(encodedState),
          plainTextContent: initialContent,
          version: 1,
        },
        { upsert: true, new: true },
      );
    }

    return ydoc;
  }

  /**
   * Applies a remote update (from another client) to the server's Yjs document.
   * @param {string} meetingId
   * @param {Uint8Array} update - The binary update message from the client.
   * @param {string} userId - The ID of the user making the change.
   */
  static async applyUpdate(meetingId, update, userId) {
    const ydoc = await this.getOrInitDocument(meetingId);

    // Apply the incoming CRDT update
    Y.applyUpdate(ydoc, new Uint8Array(update));

    // Extract the updated plain text for search indexing
    const ytext = ydoc.getText("collaborative-note");
    const plainText = ytext.toString();

    // Encode the full state to persist in the database
    const encodedState = Y.encodeStateAsUpdate(ydoc);

    await CollaborativeNote.findOneAndUpdate(
      { meetingId },
      {
        yjsState: Buffer.from(encodedState),
        plainTextContent: plainText,
        lastModifiedBy: userId,
        lastModifiedAt: new Date(),
      },
      { upsert: true },
    );
  }

  /**
   * Generates a snapshot of the current document state for version history.
   * @param {string} meetingId
   * @param {string} userId - The user triggering the snapshot.
   * @param {string} title - Optional title for the snapshot.
   */
  static async createSnapshot(meetingId, userId, title = "Manual Snapshot") {
    const note = await CollaborativeNote.findOne({ meetingId });
    if (!note) throw new Error("Document not found");

    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, new Uint8Array(note.yjsState));

    const ytext = ydoc.getText("collaborative-note");
    const snapshotContent = ytext.toString();

    // Increment version and save to snapshot collection
    const newVersion = note.version + 1;

    await NoteSnapshot.create({
      meetingId,
      version: newVersion,
      content: snapshotContent,
      createdBy: userId,
      title,
    });

    await CollaborativeNote.updateOne({ meetingId }, { $inc: { version: 1 } });

    return { version: newVersion, content: snapshotContent };
  }

  /**
   * Retrieves the state vector to allow clients to sync only missing updates.
   * @param {string} meetingId
   * @returns {Promise<Uint8Array>} The state vector.
   */
  static async getStateVector(meetingId) {
    const note = await CollaborativeNote.findOne({ meetingId });
    if (!note || !note.yjsState) return Y.encodeStateVector(new Y.Doc());

    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, new Uint8Array(note.yjsState));
    return Y.encodeStateVector(ydoc);
  }
}

module.exports = CrdtService;
