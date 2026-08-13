import MeetingChecklist from "../models/meetingChecklistModel.js";
import Meeting from "../models/meetingModel.js";
import { z } from "zod";
import {
  ValidationError,
  UnauthorizedError,
  NotFoundError,
} from "../utils/errors.js";
import { sendSuccess } from "../utils/responseHandler.js";

const createChecklistSchema = z.object({
  items: z
    .array(
      z.object({
        text: z.string().min(1, "Item text is required"),
        description: z.string().optional(),
        required: z.boolean().optional(),
      }),
    )
    .min(1, "At least one item is required"),
});

const toggleItemSchema = z.object({
  itemIndex: z.number().int().min(0),
});

export const createChecklist = async (req, res, next) => {
  try {
    const { meetingId } = req.params;
    const { items } = createChecklistSchema.parse(req.body);
    const userId = req.user.id;

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      throw new NotFoundError("Meeting not found");
    }

    if (meeting.uploadedBy.toString() !== userId && req.user.role !== "admin") {
      throw new UnauthorizedError(
        "Only the meeting owner can create a checklist",
      );
    }

    const existingChecklist = await MeetingChecklist.findOne({ meetingId });
    if (existingChecklist) {
      throw new ValidationError("Checklist already exists for this meeting");
    }

    const checklist = await MeetingChecklist.create({
      meetingId,
      organization: meeting.organization,
      createdBy: userId,
      items,
      completions: [],
    });

    sendSuccess(res, { checklist }, "Checklist created successfully", 201);
  } catch (error) {
    next(error);
  }
};

export const getChecklist = async (req, res, next) => {
  try {
    const { meetingId } = req.params;

    const checklist = await MeetingChecklist.findOne({ meetingId });
    if (!checklist) {
      // It's okay if a meeting doesn't have a checklist yet
      return sendSuccess(res, { checklist: null }, "No checklist found");
    }

    sendSuccess(res, { checklist }, "Checklist retrieved successfully");
  } catch (error) {
    next(error);
  }
};

export const toggleItem = async (req, res, next) => {
  try {
    const { meetingId } = req.params;
    const { itemIndex } = toggleItemSchema.parse(req.body);
    const userId = req.user.id;

    const checklist = await MeetingChecklist.findOne({ meetingId });
    if (!checklist) {
      throw new NotFoundError("Checklist not found");
    }

    if (itemIndex < 0 || itemIndex >= checklist.items.length) {
      throw new ValidationError("Invalid item index");
    }

    const completionIndex = checklist.completions.findIndex(
      (c) => c.itemIndex === itemIndex && c.userId.toString() === userId,
    );

    let updatedChecklist;
    if (completionIndex > -1) {
      // Remove completion
      updatedChecklist = await MeetingChecklist.findOneAndUpdate(
        { meetingId },
        { $pull: { completions: { itemIndex, userId } } },
        { new: true },
      );
    } else {
      // Add completion
      updatedChecklist = await MeetingChecklist.findOneAndUpdate(
        { meetingId },
        { $push: { completions: { itemIndex, userId } } },
        { new: true },
      );
    }

    sendSuccess(
      res,
      { checklist: updatedChecklist },
      "Item toggled successfully",
    );
  } catch (error) {
    next(error);
  }
};

export const getReadiness = async (req, res, next) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      throw new NotFoundError("Meeting not found");
    }

    if (meeting.uploadedBy.toString() !== userId && req.user.role !== "admin") {
      throw new UnauthorizedError("Only the meeting owner can view readiness");
    }

    const checklist = await MeetingChecklist.findOne({ meetingId });
    if (!checklist) {
      return sendSuccess(res, { readiness: [] }, "No checklist found");
    }

    // Calculate readiness per participant
    const totalItems = checklist.items.length;

    // Group completions by user
    const userCompletions = checklist.completions.reduce((acc, comp) => {
      const uid = comp.userId.toString();
      if (!acc[uid]) acc[uid] = 0;
      acc[uid]++;
      return acc;
    }, {});

    const readiness = meeting.participants.map((p) => {
      const uid = p.userId?.toString() || p._id?.toString() || p.id?.toString();
      const completedCount = uid ? userCompletions[uid] || 0 : 0;
      return {
        userId: p.userId || p._id || p.id,
        name: p.name || p.email || "Unknown",
        percentage:
          totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0,
        completedCount,
        totalItems,
      };
    });

    sendSuccess(res, { readiness }, "Readiness retrieved successfully");
  } catch (error) {
    next(error);
  }
};
