import mongoose from "mongoose";
import SpeakerMapping from "../models/speakerMappingModel.js";
import Meeting from "../models/meetingModel.js";
import speakerIdentificationService from "../services/speakerIdentificationService.js";
import { canAccessMeetingDoc } from "../middleware/rbac.js";

/**
 * Verify meeting existence and organization access
 */
const verifyMeetingAccess = async (meetingId, user) => {
  if (!meetingId || !mongoose.Types.ObjectId.isValid(meetingId)) {
    return { status: 400, message: "Invalid meeting ID format" };
  }

  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    return { status: 404, message: "Meeting not found" };
  }

  if (!canAccessMeetingDoc(meeting, user)) {
    return {
      status: 403,
      message: "Forbidden: You don't have access to this meeting",
    };
  }

  return { meeting };
};

/**
 * Get mappings for a meeting
 */
export const getMappings = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const access = await verifyMeetingAccess(meetingId, req.user);
    if (access.status) {
      return res
        .status(access.status)
        .json({ success: false, message: access.message });
    }

    const mappings = await SpeakerMapping.find({ meeting: meetingId });
    res.status(200).json({ success: true, data: mappings });
  } catch (error) {
    console.error("Error getting mappings:", error);
    res.status(500).json({ success: false, message: "Failed to get mappings" });
  }
};

/**
 * Get auto-suggestions for mappings
 */
export const suggestMappings = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const access = await verifyMeetingAccess(meetingId, req.user);
    if (access.status) {
      return res
        .status(access.status)
        .json({ success: false, message: access.message });
    }

    const suggestions =
      await speakerIdentificationService.suggestMappings(meetingId);
    res.status(200).json({ success: true, data: suggestions });
  } catch (error) {
    console.error("Error suggesting mappings:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to suggest mappings" });
  }
};

/**
 * Create or update a mapping and apply it
 */
export const saveAndApplyMapping = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { originalLabel, mappedName } = req.body;
    const userId = req.user?._id;

    if (!originalLabel || !mappedName) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const access = await verifyMeetingAccess(meetingId, req.user);
    if (access.status) {
      return res
        .status(access.status)
        .json({ success: false, message: access.message });
    }

    // Upsert the mapping record
    const mapping = await SpeakerMapping.findOneAndUpdate(
      { meeting: meetingId, originalLabel },
      {
        mappedName,
        isConfirmed: true,
        createdBy: userId,
      },
      { new: true, upsert: true },
    );

    // Apply the mapping to Transcript, Meeting Summary, and Action Items
    await speakerIdentificationService.applyMapping(
      meetingId,
      originalLabel,
      mappedName,
    );

    res.status(200).json({ success: true, data: mapping });
  } catch (error) {
    console.error("Error saving mapping:", error);
    res.status(500).json({ success: false, message: "Failed to save mapping" });
  }
};

/**
 * Revert a mapping
 */
export const revertMapping = async (req, res) => {
  try {
    const { meetingId, mappingId } = req.params;

    if (!mappingId || !mongoose.Types.ObjectId.isValid(mappingId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid mapping ID format" });
    }

    const access = await verifyMeetingAccess(meetingId, req.user);
    if (access.status) {
      return res
        .status(access.status)
        .json({ success: false, message: access.message });
    }

    const mapping = await SpeakerMapping.findOne({
      _id: mappingId,
      meeting: meetingId,
    });
    if (!mapping) {
      return res
        .status(404)
        .json({ success: false, message: "Mapping not found" });
    }

    // Apply reverse mapping
    await speakerIdentificationService.applyMapping(
      meetingId,
      mapping.mappedName,
      mapping.originalLabel,
    );

    // Delete the mapping record
    await SpeakerMapping.findByIdAndDelete(mappingId);

    res
      .status(200)
      .json({ success: true, message: "Mapping reverted successfully" });
  } catch (error) {
    console.error("Error reverting mapping:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to revert mapping" });
  }
};
