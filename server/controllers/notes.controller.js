const CrdtService = require("../services/crdtService");
const CollaborativeNote = require("../models/CollaborativeNote");
const NoteSnapshot = require("../models/NoteSnapshot");
const Meeting = require("../models/Meeting");

/**
 * @desc    Get note state vector and metadata
 * @route   GET /api/notes/:meetingId
 */
exports.getNoteState = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;

    // Verify user has access to this meeting
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res
        .status(404)
        .json({ success: false, error: "Meeting not found" });
    }

    // Check if user is participant or organizer (simplified logic)
    const hasAccess =
      meeting.organizer.toString() === userId ||
      meeting.participants.some((p) => p.toString() === userId);

    if (!hasAccess && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const stateVector = await CrdtService.getStateVector(meetingId);
    const note = await CollaborativeNote.findOne({ meetingId }).select(
      "plainTextContent version lastModifiedAt",
    );

    res.status(200).json({
      success: true,
      data: {
        stateVector: Array.from(stateVector),
        plainText: note?.plainTextContent || "",
        version: note?.version || 1,
        lastModifiedAt: note?.lastModifiedAt,
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
exports.getNoteHistory = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const snapshots = await NoteSnapshot.find({ meetingId })
      .sort({ version: -1 })
      .populate("createdBy", "name avatar")
      .select("version title createdBy createdAt");

    res.status(200).json({
      success: true,
      data: snapshots,
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
exports.createSnapshot = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { title } = req.body;
    const userId = req.user.id;

    const snapshot = await CrdtService.createSnapshot(
      meetingId,
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
exports.getSnapshotByVersion = async (req, res) => {
  try {
    const { meetingId, version } = req.params;

    const snapshot = await NoteSnapshot.findOne({
      meetingId,
      version,
    }).populate("createdBy", "name");

    if (!snapshot) {
      return res
        .status(404)
        .json({ success: false, error: "Snapshot not found" });
    }

    res.status(200).json({
      success: true,
      data: snapshot,
    });
  } catch (error) {
    console.error("Error fetching snapshot:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
};
