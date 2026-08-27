import AsyncMeeting from "../models/asyncMeetingModel.js";
import * as asyncMeetingService from "../services/asyncMeetingService.js";

export const createAsyncMeeting = async (req, res) => {
  try {
    const { originalMeetingId, title, participants, template, deadline } =
      req.body;

    if (!title || !participants || !template || !deadline) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const meeting = await asyncMeetingService.createAsyncMeeting({
      originalMeetingId,
      creator: req.user._id,
      title,
      participants,
      template,
      deadline,
    });

    res.status(201).json(meeting);
  } catch (error) {
    console.error("Error in createAsyncMeeting:", error);
    res.status(500).json({
      message: "Failed to create async meeting",
      error: error.message,
    });
  }
};

export const getAsyncMeetings = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get meetings where user is a participant or creator
    const meetings = await AsyncMeeting.find({
      $or: [{ creator: userId }, { participants: userId }],
    })
      .populate("creator", "name email")
      .populate("participants", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(meetings);
  } catch (error) {
    console.error("Error in getAsyncMeetings:", error);
    res.status(500).json({
      message: "Failed to fetch async meetings",
      error: error.message,
    });
  }
};

export const getAsyncMeetingById = async (req, res) => {
  try {
    const meetingId = req.params.id;
    const meeting = await AsyncMeeting.findById(meetingId)
      .populate("creator", "name email")
      .populate("participants", "name email")
      .populate("submissions.user", "name email");

    if (!meeting) {
      return res.status(404).json({ message: "Async meeting not found" });
    }

    res.status(200).json(meeting);
  } catch (error) {
    console.error("Error in getAsyncMeetingById:", error);
    res.status(500).json({
      message: "Failed to fetch async meeting details",
      error: error.message,
    });
  }
};

export const submitUpdate = async (req, res) => {
  try {
    const meetingId = req.params.id;
    const { answers } = req.body;
    const userId = req.user._id;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: "Invalid answers format" });
    }

    const meeting = await asyncMeetingService.submitUpdate(
      meetingId,
      userId,
      answers,
    );
    res.status(200).json(meeting);
  } catch (error) {
    console.error("Error in submitUpdate:", error);
    res.status(400).json({ message: error.message });
  }
};
