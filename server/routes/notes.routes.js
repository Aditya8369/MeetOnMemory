import express from "express";
import userAuth from "../middleware/userAuth.js";
import {
  getNoteState,
  getNoteHistory,
  createSnapshot,
  getSnapshotByVersion,
} from "../controllers/notes.controller.js";

const router = express.Router();

// Apply authentication to all routes
router.use(userAuth);

/**
 * @route   GET /api/notes/:meetingId
 * @desc    Fetch the current state vector and plain text of a collaborative note
 * @access  Private (Meeting Participants)
 */
router.get("/:meetingId", getNoteState);

/**
 * @route   GET /api/notes/:meetingId/history
 * @desc    Get the version history (snapshots) for a meeting note
 * @access  Private (Meeting Participants)
 */
router.get("/:meetingId/history", getNoteHistory);

/**
 * @route   POST /api/notes/:meetingId/snapshot
 * @desc    Manually trigger a snapshot save via REST (alternative to Socket)
 * @access  Private (Meeting Participants)
 */
router.post("/:meetingId/snapshot", createSnapshot);

/**
 * @route   GET /api/notes/:meetingId/snapshot/:version
 * @desc    Retrieve the content of a specific historical snapshot
 * @access  Private (Meeting Participants)
 */
router.get("/:meetingId/snapshot/:version", getSnapshotByVersion);

export default router;
