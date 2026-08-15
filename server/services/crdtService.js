import * as Y from "yjs";
import Meeting from "../models/meetingModel.js";
import NoteVersion from "../models/noteVersionModel.js";
import { snapshotNoteVersion } from "../controllers/noteVersionController.js";

/**
 * @desc Service layer for handling Yjs CRDT operations, state encoding/decoding,
 * and snapshot generation for version history.
 */
export default class CrdtService {
  /**
   * Initializes or retrieves a Yjs document for a specific meeting.
   * @param {string} meetingId - The ID of the meeting.
   * @param {string} initialContent - Fallback plain text if no CRDT state exists.
   * @returns {Promise<Y.Doc>} The initialized Yjs document.
   */
  static async getOrInitDocument(meetingId, initialContent = "") {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) throw new Error("Meeting not found");

    const ydoc = new Y.Doc();

    if (meeting.crdtState) {
      // Apply existing binary state to the new Yjs document
      Y.applyUpdate(ydoc, new Uint8Array(meeting.crdtState));
    } else {
      // Initialize with default content if it's a brand new document
      const ytext = ydoc.getText("notes"); // Compatible with documentSync.js using 'notes'

      // Use a transaction to batch the initial insertion
      ydoc.transact(() => {
        ytext.insert(0, initialContent);
      });

      // Save the initial state to the database
      const encodedState = Y.encodeStateAsUpdate(ydoc);
      meeting.crdtState = Buffer.from(encodedState);
      meeting.collaborativeNotes = initialContent;
      await meeting.save();
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
    const ytext = ydoc.getText("notes"); // Compatible with documentSync.js using 'notes'
    const plainText = ytext.toString();

    // Encode the full state to persist in the database
    const encodedState = Y.encodeStateAsUpdate(ydoc);

    await Meeting.findByIdAndUpdate(
      meetingId,
      {
        $set: {
          crdtState: Buffer.from(encodedState),
          collaborativeNotes: plainText,
        },
      },
      { new: true },
    );

    // Automatically snapshot changes using noteVersionController
    await snapshotNoteVersion(
      meetingId,
      "collaborativeNotes",
      plainText,
      "user_edit",
      userId,
    );
  }

  /**
   * Generates a snapshot of the current document state for version history.
   * @param {string} meetingId
   * @param {string} userId - The user triggering the snapshot.
   * @param {string} title - Optional title for the snapshot.
   */
  static async createSnapshot(meetingId, userId, title = "Manual Snapshot") {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting || !meeting.crdtState) {
      throw new Error("Document not found or empty");
    }

    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, new Uint8Array(meeting.crdtState));

    const ytext = ydoc.getText("notes"); // Compatible with documentSync.js using 'notes'
    const snapshotContent = ytext.toString();

    // Create NoteVersion snapshot using noteVersionController
    const snapshot = await snapshotNoteVersion(
      meetingId,
      "collaborativeNotes",
      snapshotContent,
      "user_edit",
      userId,
    );

    return {
      version: snapshot ? snapshot.version : 1,
      content: snapshotContent,
    };
  }

  /**
   * Retrieves the state vector to allow clients to sync only missing updates.
   * @param {string} meetingId
   * @returns {Promise<Uint8Array>} The state vector.
   */
  static async getStateVector(meetingId) {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting || !meeting.crdtState) {
      return Y.encodeStateVector(new Y.Doc());
    }

    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, new Uint8Array(meeting.crdtState));
    return Y.encodeStateVector(ydoc);
  }
}
