import mongoose from "mongoose";
import {
  generateSuggestions,
  applyAcceptedSuggestions,
} from "../services/agendaSuggestionService.js";
import AgendaSuggestion from "../models/agendaSuggestionModel.js";
import Meeting from "../models/meetingModel.js";
import { canAccessMeetingDoc } from "../middleware/rbac.js";

// @route   POST /api/agenda-suggestions/generate
// @desc    Generate new agenda suggestions based on organization context
export const generateAgenda = async (req, res) => {
  try {
    const meetingId = req.body.meetingId;
    const requestedOrgId = req.body.organizationId;
    const userOrgId = (
      req.user?.organization?._id || req.user?.organization
    )?.toString();

    if (!userOrgId) {
      return res
        .status(403)
        .json({ message: "Forbidden: Organization membership required" });
    }

    if (requestedOrgId && requestedOrgId.toString() !== userOrgId) {
      return res
        .status(403)
        .json({ message: "Forbidden: Cross-organization access denied" });
    }

    if (meetingId) {
      if (!mongoose.Types.ObjectId.isValid(meetingId)) {
        return res.status(400).json({ message: "Invalid meeting ID format" });
      }

      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }

      if (!canAccessMeetingDoc(meeting, req.user)) {
        return res.status(403).json({
          message: "Forbidden: You don't have access to this meeting",
        });
      }
    }

    const suggestion = await generateSuggestions(userOrgId, meetingId);
    res.status(201).json(suggestion);
  } catch (error) {
    console.error("Error generating agenda suggestions:", error);
    res.status(500).json({
      message: "Failed to generate agenda suggestions",
      error: error.message,
    });
  }
};

// @route   PUT /api/agenda-suggestions/:id/item/:itemId
// @desc    Update a specific suggestion item (accept, reject, edit)
export const updateSuggestionItem = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { status, acceptedText } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(itemId)
    ) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const suggestionDoc = await AgendaSuggestion.findById(id);
    if (!suggestionDoc) {
      return res.status(404).json({ message: "Agenda suggestion not found" });
    }

    const userOrgId = (
      req.user?.organization?._id || req.user?.organization
    )?.toString();
    if (!userOrgId || suggestionDoc.organization?.toString() !== userOrgId) {
      return res
        .status(403)
        .json({ message: "Forbidden: Cross-organization access denied" });
    }

    if (suggestionDoc.meeting) {
      const meeting = await Meeting.findById(suggestionDoc.meeting);
      if (meeting && !canAccessMeetingDoc(meeting, req.user)) {
        return res.status(403).json({
          message: "Forbidden: You don't have access to this meeting",
        });
      }
    }

    const item = suggestionDoc.suggestions.id(itemId);
    if (!item) {
      return res.status(404).json({ message: "Suggestion item not found" });
    }

    if (status) item.status = status;
    if (acceptedText !== undefined) item.acceptedText = acceptedText;

    await suggestionDoc.save();
    res.status(200).json(suggestionDoc);
  } catch (error) {
    console.error("Error updating suggestion item:", error);
    res.status(500).json({
      message: "Failed to update suggestion item",
      error: error.message,
    });
  }
};

// @route   POST /api/agenda-suggestions/:id/apply
// @desc    Apply accepted suggestions to the meeting's agenda
export const applyAgenda = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid suggestion ID format" });
    }

    const suggestionDoc = await AgendaSuggestion.findById(id);
    if (!suggestionDoc) {
      return res.status(404).json({ message: "Agenda suggestion not found" });
    }

    const userOrgId = (
      req.user?.organization?._id || req.user?.organization
    )?.toString();
    if (!userOrgId || suggestionDoc.organization?.toString() !== userOrgId) {
      return res
        .status(403)
        .json({ message: "Forbidden: Cross-organization access denied" });
    }

    const meeting = await Meeting.findById(suggestionDoc.meeting);
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    if (!canAccessMeetingDoc(meeting, req.user)) {
      return res
        .status(403)
        .json({ message: "Forbidden: You don't have access to this meeting" });
    }

    const updatedMeeting = await applyAcceptedSuggestions(id);
    res.status(200).json(updatedMeeting);
  } catch (error) {
    console.error("Error applying agenda suggestions:", error);
    res.status(500).json({
      message: "Failed to apply agenda suggestions",
      error: error.message,
    });
  }
};

// @route   GET /api/agenda-suggestions/meeting/:meetingId
// @desc    Get suggestions for a specific meeting
export const getSuggestionsByMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(meetingId)) {
      return res.status(400).json({ message: "Invalid meeting ID format" });
    }

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    if (!canAccessMeetingDoc(meeting, req.user)) {
      return res
        .status(403)
        .json({ message: "Forbidden: You don't have access to this meeting" });
    }

    const userOrgId = (
      req.user?.organization?._id || req.user?.organization
    )?.toString();

    const suggestions = await AgendaSuggestion.find({
      meeting: meetingId,
      organization: userOrgId,
    }).sort({ createdAt: -1 });
    res.status(200).json(suggestions);
  } catch (error) {
    console.error("Error fetching agenda suggestions:", error);
    res.status(500).json({
      message: "Failed to fetch agenda suggestions",
      error: error.message,
    });
  }
};
