const express = require("express");
const router = express.Router();
const notesController = require("../controllers/notes.controller");
const { protect } = require("../middleware/authMiddleware"); // Assumed existing middleware

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/notes/:meetingId
 * @desc    Fetch the current state vector and plain text of a collaborative note
 * @access  Private (Meeting Participants)
 */
router.get("/:meetingId", notesController.getNoteState);

/**
 * @route   GET /api/notes/:meetingId/history
 * @desc    Get the version history (snapshots) for a meeting note
 * @access  Private (Meeting Participants)
 */
router.get("/:meetingId/history", notesController.getNoteHistory);

/**
 * @route   POST /api/notes/:meetingId/snapshot
 * @desc    Manually trigger a snapshot save via REST (alternative to Socket)
 * @access  Private (Meeting Participants)
 */
router.post("/:meetingId/snapshot", notesController.createSnapshot);

/**
 * @route   GET /api/notes/:meetingId/snapshot/:version
 * @desc    Retrieve the content of a specific historical snapshot
 * @access  Private (Meeting Participants)
 */
router.get(
  "/:meetingId/snapshot/:version",
  notesController.getSnapshotByVersion,
);

module.exports = router;
