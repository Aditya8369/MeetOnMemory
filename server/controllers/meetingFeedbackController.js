import { z } from "zod";
import mongoose from "mongoose";
import MeetingFeedback from "../models/meetingFeedbackModel.js";
import {
  resolveMeetingFeedbackAccess,
  resolveOwnedFeedbackForMutation,
} from "../utils/meetingFeedbackAccess.js";

const feedbackSchema = z.object({
  meetingId: z.string().min(1, "Meeting ID is required"),
  overallRating: z.number().min(1).max(5),
  summaryAccuracy: z.number().min(1).max(5),
  transcriptQuality: z.number().min(1).max(5),
  comment: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const sendAccessError = (res, error) =>
  res.status(error.status).json({ success: false, message: error.message });

// @desc    Submit or update feedback for a meeting
// @route   POST /api/feedback
// @access  Private
export const submitFeedback = async (req, res, next) => {
  try {
    const validatedData = feedbackSchema.parse(req.body);
    const userId = req.user._id;

    const access = await resolveMeetingFeedbackAccess(
      validatedData.meetingId,
      req.user,
    );
    if (access.error) {
      return sendAccessError(res, access.error);
    }

    const { meeting } = access;

    const feedbackData = {
      ...validatedData,
      userId,
      organization: meeting.organization || req.user.organization,
    };

    const feedback = await MeetingFeedback.findOneAndUpdate(
      { meetingId: validatedData.meetingId, userId },
      { $set: feedbackData },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    const io = req.app.get("io");
    if (io) {
      io.to(validatedData.meetingId).emit("feedback:submitted", feedback);
    }

    res.status(200).json({ success: true, feedback });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(error);
    }
    console.error("Error submitting feedback:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc    Get all feedback for a specific meeting
// @route   GET /api/feedback/meeting/:meetingId
// @access  Private
export const getFeedbackForMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const access = await resolveMeetingFeedbackAccess(meetingId, req.user);
    if (access.error) {
      return sendAccessError(res, access.error);
    }

    const feedback = await MeetingFeedback.find({ meetingId }).populate(
      "userId",
      "name email profilePicture",
    );

    res.status(200).json({ success: true, feedback });
  } catch (error) {
    console.error("Error fetching meeting feedback:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc    Get user's own feedback for a specific meeting
// @route   GET /api/feedback/meeting/:meetingId/user
// @access  Private
export const getUserFeedbackForMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user._id;

    const access = await resolveMeetingFeedbackAccess(meetingId, req.user);
    if (access.error) {
      return sendAccessError(res, access.error);
    }

    const feedback = await MeetingFeedback.findOne({ meetingId, userId });

    res.status(200).json({ success: true, feedback: feedback || null });
  } catch (error) {
    console.error("Error fetching user meeting feedback:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc    Get aggregate feedback for an organization
// @route   GET /api/feedback/aggregate/:orgId
// @access  Private
export const getAggregateFeedback = async (req, res) => {
  try {
    const { orgId } = req.params;

    if (!mongoose.isValidObjectId(orgId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid organization ID" });
    }

    if (req.user.organization?.toString() !== orgId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this organization's feedback",
      });
    }

    const aggregation = await MeetingFeedback.aggregate([
      { $match: { organization: new mongoose.Types.ObjectId(orgId) } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          avgOverall: { $avg: "$overallRating" },
          avgSummary: { $avg: "$summaryAccuracy" },
          avgTranscript: { $avg: "$transcriptQuality" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const formattedData = aggregation.map((item) => {
      const date = new Date(item._id.year, item._id.month - 1);
      return {
        month: date.toLocaleString("default", {
          month: "short",
          year: "numeric",
        }),
        overall: Number(item.avgOverall.toFixed(2)),
        summary: Number(item.avgSummary.toFixed(2)),
        transcript: Number(item.avgTranscript.toFixed(2)),
        count: item.count,
      };
    });

    res.status(200).json({ success: true, data: formattedData });
  } catch (error) {
    console.error("Error aggregating feedback:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc    Delete a feedback entry
// @route   DELETE /api/feedback/:id
// @access  Private
export const deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;

    const access = await resolveOwnedFeedbackForMutation(id, req.user);
    if (access.error) {
      return sendAccessError(res, access.error);
    }

    await access.feedback.deleteOne();

    res
      .status(200)
      .json({ success: true, message: "Feedback deleted successfully" });
  } catch (error) {
    console.error("Error deleting feedback:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};
