import MeetingSeries from "../models/meetingSeriesModel.js";

import Meeting from "../models/meetingModel.js";
import {
  overrideRoleAssignment,
  getRoleAssignmentsForMeeting,
  assignRolesForNextOccurrence,
} from "../services/roleAssignmentService.js";

/**
 * Get the role rotation config for a meeting series.
 */
export const getRoleRotationConfig = async (req, res) => {
  try {
    const series = await MeetingSeries.findById(req.params.id).populate(
      "roleRotationPool",
      "name email profilePicture",
    );

    if (!series) {
      return res.status(404).json({ message: "Meeting series not found." });
    }

    res.status(200).json({
      enableRoleRotation: series.enableRoleRotation,
      roleRotationPool: series.roleRotationPool,
    });
  } catch (error) {
    console.error("Error in getRoleRotationConfig:", error);
    res.status(500).json({ message: "Server error while fetching config." });
  }
};

/**
 * Update the role rotation config for a meeting series.
 */
export const updateRoleRotationConfig = async (req, res) => {
  try {
    const { enableRoleRotation, roleRotationPool } = req.body;
    const series = await MeetingSeries.findById(req.params.id);

    if (!series) {
      return res.status(404).json({ message: "Meeting series not found." });
    }

    if (enableRoleRotation !== undefined)
      series.enableRoleRotation = enableRoleRotation;
    if (roleRotationPool !== undefined)
      series.roleRotationPool = roleRotationPool;

    await series.save();

    // Repopulate for response
    await series.populate("roleRotationPool", "name email profilePicture");

    if (series.enableRoleRotation) {
      // Find upcoming meetings in this series and assign roles if they don't have them
      const upcomingMeetings = await Meeting.find({
        series: series._id,
        date: { $gte: new Date() },
        status: "uploaded", // assuming this means not yet happened
      }).sort({ date: 1 });

      const poolParticipantIds = series.roleRotationPool.map((u) =>
        u._id.toString(),
      );

      for (const meeting of upcomingMeetings) {
        // Check if assignments already exist
        const existingRoles = await getRoleAssignmentsForMeeting(meeting._id);
        if (existingRoles.length === 0) {
          await assignRolesForNextOccurrence(
            series._id,
            meeting._id,
            poolParticipantIds,
          );
        }
      }
    }

    res.status(200).json({
      enableRoleRotation: series.enableRoleRotation,
      roleRotationPool: series.roleRotationPool,
    });
  } catch (error) {
    console.error("Error in updateRoleRotationConfig:", error);
    res.status(500).json({ message: "Server error while updating config." });
  }
};

/**
 * Override a role assignment manually for a specific meeting
 */
export const overrideRole = async (req, res) => {
  try {
    const { meetingId, userId, role } = req.body;
    const seriesId = req.params.id;

    if (!meetingId || !userId || !role) {
      return res
        .status(400)
        .json({ message: "meetingId, userId, and role are required." });
    }

    const assignment = await overrideRoleAssignment(
      seriesId,
      meetingId,
      userId,
      role,
    );
    await assignment.populate("userId", "name email");

    res.status(200).json({
      message: "Role overridden successfully",
      assignment,
    });
  } catch (error) {
    console.error("Error in overrideRole:", error);
    res.status(500).json({ message: "Server error overriding role." });
  }
};

/**
 * Get role assignments for a specific meeting
 */
export const getMeetingRoles = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const roles = await getRoleAssignmentsForMeeting(meetingId);
    res.status(200).json(roles);
  } catch (error) {
    console.error("Error in getMeetingRoles:", error);
    res.status(500).json({ message: "Server error fetching roles." });
  }
};
