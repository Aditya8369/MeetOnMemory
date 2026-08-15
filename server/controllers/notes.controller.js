import CrdtService from "../services/crdtService.js";
import NoteVersion from "../models/noteVersionModel.js";
import Meeting from "../models/meetingModel.js";

/**
 * @desc    Get note state vector and metadata
 * @route   GET /api/notes/:meetingId
 */
export const getNoteState = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id || req.user._id;

    // Verify user has access to this meeting
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res
        .status(404)
        .json({ success: false, error: "Meeting not found" });
    }

    // Organization authorization: enforce matching organization
    if (
      meeting.organization &&
      req.user.organization &&
      meeting.organization.toString() !== req.user.organization.toString()
    ) {
      return res
        .status(403)
        .json({
          success: false,
          error: "Access denied: organization mismatch",
        });
    }

    // Check if user is participant or organizer
    const hasAccess =
      meeting.uploadedBy.toString() === userId.toString() ||
      meeting.participants.some(
        (p) => p.user && p.user.toString() === userId.toString(),
      );

    if (!hasAccess && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const stateVector = await CrdtService.getStateVector(meetingId);

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
    const userId = req.user.id || req.user._id;

    // Access check
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res
        .status(404)
        .json({ success: false, error: "Meeting not found" });
    }

    if (
      meeting.organization &&
      req.user.organization &&
      meeting.organization.toString() !== req.user.organization.toString()
    ) {
      return res
        .status(403)
        .json({
          success: false,
          error: "Access denied: organization mismatch",
        });
    }

    const hasAccess =
      meeting.uploadedBy.toString() === userId.toString() ||
      meeting.participants.some(
        (p) => p.user && p.user.toString() === userId.toString(),
      );

    if (!hasAccess && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const snapshots = await NoteVersion.find({
      meetingId,
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

    // Access check
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res
        .status(404)
        .json({ success: false, error: "Meeting not found" });
    }

    if (
      meeting.organization &&
      req.user.organization &&
      meeting.organization.toString() !== req.user.organization.toString()
    ) {
      return res
        .status(403)
        .json({
          success: false,
          error: "Access denied: organization mismatch",
        });
    }

    const hasAccess =
      meeting.uploadedBy.toString() === userId.toString() ||
      meeting.participants.some(
        (p) => p.user && p.user.toString() === userId.toString(),
      );

    if (!hasAccess && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

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
export const getSnapshotByVersion = async (req, res) => {
  try {
    const { meetingId, version } = req.params;
    const userId = req.user.id || req.user._id;

    // Access check
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res
        .status(404)
        .json({ success: false, error: "Meeting not found" });
    }

    if (
      meeting.organization &&
      req.user.organization &&
      meeting.organization.toString() !== req.user.organization.toString()
    ) {
      return res
        .status(403)
        .json({
          success: false,
          error: "Access denied: organization mismatch",
        });
    }

    const hasAccess =
      meeting.uploadedBy.toString() === userId.toString() ||
      meeting.participants.some(
        (p) => p.user && p.user.toString() === userId.toString(),
      );

    if (!hasAccess && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    const snapshot = await NoteVersion.findOne({
      meetingId,
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
