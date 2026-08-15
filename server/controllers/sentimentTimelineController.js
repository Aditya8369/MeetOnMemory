import mongoose from "mongoose";
import SentimentTimeline from "../models/sentimentTimelineModel.js";
import { generateSentimentTimeline } from "../services/sentimentTimelineService.js";
import Meeting from "../models/meetingModel.js";
import { canAccessMeetingDoc } from "../middleware/rbac.js";

// Fetch existing timeline
export const getTimeline = async (req, res) => {
  try {
    const { meetingId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(meetingId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid meeting ID format" });
    }

    // Authorization check
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res
        .status(404)
        .json({ success: false, message: "Meeting not found" });
    }

    if (!canAccessMeetingDoc(meeting, req.user)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You don't have access to this meeting",
      });
    }

    const timeline = await SentimentTimeline.findOne({ meeting: meetingId });
    if (!timeline) {
      return res
        .status(404)
        .json({ success: false, message: "Timeline not found" });
    }

    return res.status(200).json({ success: true, timeline });
  } catch (error) {
    console.error("Error fetching sentiment timeline:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// Generate (or regenerate) timeline
export const generateTimeline = async (req, res) => {
  try {
    const { meetingId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(meetingId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid meeting ID format" });
    }

    // Authorization check
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res
        .status(404)
        .json({ success: false, message: "Meeting not found" });
    }

    if (!canAccessMeetingDoc(meeting, req.user)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You don't have access to this meeting",
      });
    }

    // Call service to generate
    const timeline = await generateSentimentTimeline(meetingId);

    return res.status(200).json({ success: true, timeline });
  } catch (error) {
    console.error("Error generating sentiment timeline:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate timeline",
      error: error.message,
    });
  }
};
