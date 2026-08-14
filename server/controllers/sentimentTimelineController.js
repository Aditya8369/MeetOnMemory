import SentimentTimeline from "../models/sentimentTimelineModel.js";
import { generateSentimentTimeline } from "../services/sentimentTimelineService.js";
import Meeting from "../models/meetingModel.js";

// Fetch existing timeline
export const getTimeline = async (req, res) => {
  try {
    const { meetingId } = req.params;

    // Authorization check
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res
        .status(404)
        .json({ success: false, message: "Meeting not found" });
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

    // Authorization check
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res
        .status(404)
        .json({ success: false, message: "Meeting not found" });
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
