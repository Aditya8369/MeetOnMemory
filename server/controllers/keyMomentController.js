import { z } from "zod";
import mongoose from "mongoose";
import KeyMoment from "../models/keyMomentModel.js";
import Meeting from "../models/meetingModel.js";

const keyMomentSchema = z.object({
  meetingId: z.string().min(1, "Meeting ID is required"),
  snippet: z.string().min(1).max(500),
  startTime: z.number().min(0),
  endTime: z.number().min(0),
  category: z.enum([
    "decision",
    "action_item",
    "insight",
    "question",
    "disagreement",
  ]),
  note: z.string().optional().default(""),
});

const updateKeyMomentSchema = z.object({
  category: z
    .enum(["decision", "action_item", "insight", "question", "disagreement"])
    .optional(),
  note: z.string().optional(),
});

// @desc    Create a new key moment
// @route   POST /api/key-moments
// @access  Private
export const createKeyMoment = async (req, res, next) => {
  try {
    const validatedData = keyMomentSchema.parse(req.body);
    const userId = req.user._id;

    const meeting = await Meeting.findById(validatedData.meetingId);
    if (!meeting) {
      return res
        .status(404)
        .json({ success: false, message: "Meeting not found" });
    }

    const isOwner = meeting.uploadedBy.toString() === userId.toString();
    const isParticipant = meeting.participants?.some(
      (p) => p.user?.toString() === userId.toString(),
    );

    if (!isOwner && !isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to create key moments for this meeting",
      });
    }

    if (validatedData.endTime < validatedData.startTime) {
      return res.status(400).json({
        success: false,
        message: "End time cannot be before start time",
      });
    }

    const newMoment = await KeyMoment.create({
      ...validatedData,
      userId,
      organization: meeting.organization || req.user.organization,
    });

    const populatedMoment = await KeyMoment.findById(newMoment._id).populate(
      "userId",
      "name email profilePicture",
    );

    const io = req.app.get("io");
    if (io) {
      io.to(validatedData.meetingId).emit("keyMoment:created", populatedMoment);
    }

    res.status(201).json({ success: true, keyMoment: populatedMoment });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate key moment found for this user at this exact time",
      });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors,
      });
    }
    console.error("Error creating key moment:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc    Get all key moments for a specific meeting
// @route   GET /api/key-moments/meeting/:meetingId
// @access  Private
export const getKeyMomentsForMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(meetingId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid meeting ID" });
    }

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res
        .status(404)
        .json({ success: false, message: "Meeting not found" });
    }

    const isOwner = meeting.uploadedBy.toString() === userId.toString();
    const isParticipant = meeting.participants?.some(
      (p) => p.user?.toString() === userId.toString(),
    );

    if (!isOwner && !isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view key moments for this meeting",
      });
    }

    const moments = await KeyMoment.find({ meetingId })
      .populate("userId", "name email profilePicture")
      .sort({ startTime: 1 });

    res.status(200).json({ success: true, keyMoments: moments });
  } catch (error) {
    console.error("Error fetching key moments:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc    Update a key moment (note or category)
// @route   PATCH /api/key-moments/:id
// @access  Private
export const updateKeyMoment = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateKeyMomentSchema.parse(req.body);

    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid key moment ID" });
    }

    const moment = await KeyMoment.findById(id);
    if (!moment) {
      return res
        .status(404)
        .json({ success: false, message: "Key moment not found" });
    }

    if (moment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this key moment",
      });
    }

    Object.assign(moment, validatedData);
    await moment.save();

    const populatedMoment = await KeyMoment.findById(id).populate(
      "userId",
      "name email profilePicture",
    );

    const io = req.app.get("io");
    if (io) {
      io.to(moment.meetingId.toString()).emit(
        "keyMoment:updated",
        populatedMoment,
      );
    }

    res.status(200).json({ success: true, keyMoment: populatedMoment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors,
      });
    }
    console.error("Error updating key moment:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc    Delete a key moment
// @route   DELETE /api/key-moments/:id
// @access  Private
export const deleteKeyMoment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid key moment ID" });
    }

    const moment = await KeyMoment.findById(id);
    if (!moment) {
      return res
        .status(404)
        .json({ success: false, message: "Key moment not found" });
    }

    if (moment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this key moment",
      });
    }

    const meetingId = moment.meetingId;
    await moment.deleteOne();

    const io = req.app.get("io");
    if (io) {
      io.to(meetingId.toString()).emit("keyMoment:deleted", id);
    }

    res
      .status(200)
      .json({ success: true, message: "Key moment deleted successfully", id });
  } catch (error) {
    console.error("Error deleting key moment:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};
