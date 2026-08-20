import CrdtService from "../services/crdtService.js";
import NoteVersion from "../models/noteVersionModel.js";
import { resolveAccessibleMeeting } from "../utils/resolveAccessibleMeeting.js";

/**
 * Authorize meeting access before any collaborative-notes CRDT / snapshot work.
 * Uses the shared resolver (owner or same organization) — never trust meetingId alone.
 *
 * @param {string} meetingId
 * @param {object} user - Authenticated MongoDB user (`req.user`)
 * @param {import("express").Response} res
 * @returns {Promise<object|null>} Meeting document, or null after sending an error response
 */
async function requireNotesMeetingAccess(meetingId, user, res) {
  const access = await resolveAccessibleMeeting(meetingId, user);
  if (access.error) {
    res.status(access.error.status).json({
      success: false,
      error: access.error.message,
    });
    return null;
  }
  return access.meeting;
}

/**
 * @desc    Get note state vector and metadata
 * @route   GET /api/notes/:meetingId
 */
export const getNoteState = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const meeting = await requireNotesMeetingAccess(meetingId, req.user, res);
    if (!meeting) return;

    const authorizedMeetingId = meeting._id;
    const stateVector = await CrdtService.getStateVector(authorizedMeetingId);

    res.status(200).json({
      success: true,
      data: {
        stateVector: Array.from(stateVector),
        plainText: meeting.collaborativeNotes || "",
        version: 1,
        lastModifiedAt: meeting.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching note state:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

/**
 * @desc    Get version history list
 * @route   GET /api/notes/:meetingId/history
 */
export const getNoteHistory = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const meeting = await requireNotesMeetingAccess(meetingId, req.user, res);
    if (!meeting) return;

    const authorizedMeetingId = meeting._id;

    const snapshots = await NoteVersion.find({
      meetingId: authorizedMeetingId,
      field: "collaborativeNotes",
    })
      .sort({ version: -1 })
      .populate("changedBy", "name")
      .select("version changeSource changedBy createdAt");

    const formattedSnapshots = snapshots.map((s) => ({
      version: s.version,
      title:
        s.changeSource === "user_edit"
          ? "User Edit"
          : s.changeSource === "ai_processing"
            ? "AI Processing"
            : "System Snapshot",
      createdBy: s.changedBy,
      createdAt: s.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: formattedSnapshots,
    });
  } catch (error) {
    console.error("Error fetching note history:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

/**
 * @desc    Create a manual snapshot
 * @route   POST /api/notes/:meetingId/snapshot
 */
export const createSnapshot = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { title } = req.body;
    const userId = req.user.id || req.user._id;

    const meeting = await requireNotesMeetingAccess(meetingId, req.user, res);
    if (!meeting) return;

    const authorizedMeetingId = meeting._id;

    const snapshot = await CrdtService.createSnapshot(
      authorizedMeetingId,
      userId,
      title || "Manual Snapshot",
    );

    res.status(201).json({
      success: true,
      data: snapshot,
    });
  } catch (error) {
    console.error("Error creating snapshot:", error);
    res
      .status(500)
      .json({ success: false, error: error.message || "Server error" });
  }
};

/**
 * @desc    Get specific snapshot content
 * @route   GET /api/notes/:meetingId/snapshot/:version
 */
export const getSnapshotByVersion = async (req, res) => {
  try {
    const { meetingId, version } = req.params;

    const meeting = await requireNotesMeetingAccess(meetingId, req.user, res);
    if (!meeting) return;

    const authorizedMeetingId = meeting._id;

    const snapshot = await NoteVersion.findOne({
      meetingId: authorizedMeetingId,
      field: "collaborativeNotes",
      version,
    }).populate("changedBy", "name");

    if (!snapshot) {
      return res
        .status(404)
        .json({ success: false, error: "Snapshot not found" });
    }

    res.status(200).json({
      success: true,
      data: {
        version: snapshot.version,
        content: snapshot.content,
        createdBy: snapshot.changedBy,
        createdAt: snapshot.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching snapshot:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
};
