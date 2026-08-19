// server/controllers/workspaceController.js
import Meeting from "../models/meetingModel.js";
import Membership from "../models/membershipModel.js";
import mongoose from "mongoose";

/**
 * Authorize access to a meeting workspace.
 *
 * Workspace state retrieval and mutation must use the same authorization
 * rules so that a caller cannot mutate a meeting they cannot access.
 *
 * A user must:
 *  - be the meeting owner or an explicit meeting participant; and
 *  - when the meeting belongs to an organization, have an active
 *    organization membership.
 *
 * Returns the meeting when authorized, otherwise sends the appropriate
 * response and returns null.
 */
const authorizeWorkspaceMeeting = async (meetingId, user, res) => {
  if (!mongoose.Types.ObjectId.isValid(meetingId)) {
    res.status(400).json({
      success: false,
      message: "Invalid Meeting ID",
    });
    return null;
  }

  if (!user?._id) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return null;
  }

  const meeting = await Meeting.findById(meetingId).select(
    "warRoom participants uploadedBy title organization",
  );

  if (!meeting) {
    res.status(404).json({
      success: false,
      message: "Meeting not found",
    });
    return null;
  }

  const userId = user._id.toString();
  const userEmail = user.email?.toLowerCase();

  const isParticipant = meeting.participants.some((participant) => {
    const participantUserId = participant.user?.toString();
    const participantEmail = participant.email?.toLowerCase();

    return (
      participantUserId === userId ||
      Boolean(userEmail && participantEmail === userEmail)
    );
  });

  const isOwner = meeting.uploadedBy?.toString() === userId;

  if (!isParticipant && !isOwner) {
    res.status(403).json({
      success: false,
      message: "Forbidden: Not a meeting participant",
    });
    return null;
  }

  // Organization-scoped meetings require an active membership in the
  // meeting's organization as an additional authorization boundary.
  if (meeting.organization) {
    const membership = await Membership.findOne({
      user: user._id,
      organization: meeting.organization,
      status: "active",
    }).select("_id");

    if (!membership) {
      res.status(403).json({
        success: false,
        message: "Forbidden: Not a member of the meeting organization",
      });
      return null;
    }
  }

  return meeting;
};

/**
 * @desc Get initial War Room state (Canvas + Action Board)
 * @route GET /api/workspace/:meetingId/state
 * @access Private (Participants only)
 */
export const getWorkspaceState = async (req, res) => {
  try {
    const meeting = await authorizeWorkspaceMeeting(
      req.params.meetingId,
      req.user,
      res,
    );

    if (!meeting) {
      return;
    }

    // Default structure if warRoom doesn't exist yet
    const warRoom = meeting.warRoom || {
      canvasNodes: [],
      canvasPaths: [],
      actionColumns: {
        backlog: [],
        "in-progress": [],
        blocked: [],
        done: [],
      },
    };

    res.status(200).json({
      success: true,
      meetingTitle: meeting.title,
      warRoom,
      participants: meeting.participants,
    });
  } catch (error) {
    console.error("Error fetching workspace state:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching workspace state",
    });
  }
};

/**
 * @desc Add a new action item to the backlog via REST (fallback if socket fails)
 * @route POST /api/workspace/:meetingId/action
 * @access Private
 */
export const addActionItem = async (req, res) => {
  try {
    const { title, assignee, priority } = req.body;

    if (!title || title.trim().length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Action title is required" });
    }

    const meeting = await authorizeWorkspaceMeeting(
      req.params.meetingId,
      req.user,
      res,
    );

    if (!meeting) {
      return;
    }

    if (!meeting.warRoom) meeting.warRoom = { actionColumns: {} };
    if (!meeting.warRoom.actionColumns) meeting.warRoom.actionColumns = {};
    if (!meeting.warRoom.actionColumns.backlog)
      meeting.warRoom.actionColumns.backlog = [];

    const newItem = {
      _id: new mongoose.Types.ObjectId(),
      title: title.trim(),
      assignee,
      priority: priority || "medium",
      createdAt: new Date(),
    };

    meeting.warRoom.actionColumns.backlog.push(newItem);
    meeting.markModified("warRoom.actionColumns");
    await meeting.save();

    res.status(201).json({
      success: true,
      message: "Action item added to backlog",
      item: newItem,
    });
  } catch (error) {
    console.error("Error adding action item:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error adding action item" });
  }
};
