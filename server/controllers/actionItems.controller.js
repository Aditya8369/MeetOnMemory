import ActionItem from "../models/ActionItem.js";
import ActionItemExtractor from "../services/actionItemExtractor.js";
import { syncActionItemToGitHub } from "../services/githubSyncService.js";

/**
 * @desc Trigger AI extraction from meeting transcript (Idempotent)
 */
export const extractFromMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;

    // Idempotency check: Prevent duplicate extractions
    const existingCount = await ActionItem.countDocuments({
      meetingId,
      aiConfidence: { $exists: true },
    });
    if (existingCount > 0) {
      return res.status(400).json({
        success: false,
        error: "Action items have already been extracted for this meeting.",
      });
    }

    const meeting = req.meeting; // Populated by verifyMeetingAccess
    if (!meeting.transcript || meeting.transcript.length < 100) {
      return res
        .status(400)
        .json({ success: false, error: "Transcript is too short." });
    }

    const extractedItems = await ActionItemExtractor.extractFromTranscript(
      meeting.transcript,
      meeting.participants,
    );

    // Explicitly handle state initialization since insertMany bypasses pre('save')
    const now = new Date();
    const itemsToInsert = extractedItems.map((item) => {
      let status = "pending";
      if (item.deadline && new Date(item.deadline) < now) status = "overdue";

      return {
        ...item,
        meetingId,
        assignedBy: userId,
        status,
        completedAt: null,
      };
    });

    const savedItems = await ActionItem.insertMany(itemsToInsert);

    // Sync with GitHub
    try {
      if (process.env.NODE_ENV !== "test") {
        // Fire and forget in production to avoid blocking response
        savedItems.forEach((item) => {
          syncActionItemToGitHub(item).catch((err) =>
            console.error("GitHub Sync Error:", err),
          );
        });
      } else {
        // Await in test to prevent Jest teardown errors
        await Promise.allSettled(
          savedItems.map((item) => syncActionItemToGitHub(item)),
        );
      }
    } catch (err) {
      console.error("Failed to sync to GitHub:", err);
    }

    res
      .status(201)
      .json({ success: true, count: savedItems.length, data: savedItems });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: error.message || "Server error" });
  }
};

/**
 * @desc Get action items for the current user
 */
export const getActionItems = async (req, res) => {
  try {
    const { status, priority, meetingId } = req.query;
    const userId = req.user.id;
    const orgId = req.user.organizationId;

    const filter = {
      $or: [{ assignee: userId }, { assignedBy: userId }],
      meetingId: { $in: await getOrgMeetingIds(orgId) }, // Scope to org
    };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (meetingId) filter.meetingId = meetingId;

    const items = await ActionItem.find(filter)
      .sort({ deadline: 1, priority: -1 })
      .populate("assignee", "name avatar")
      .populate("assignedBy", "name")
      .populate("meetingId", "title date");

    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (_error) {
    res.status(500).json({ success: false, error: "Server error" });
  }
};

/**
 * @desc Get action items for a specific meeting
 */
export const getMeetingActionItems = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const items = await ActionItem.find({ meetingId })
      .sort({ createdAt: 1 })
      .populate("assignee", "name avatar")
      .populate("assignedBy", "name");

    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (_error) {
    res.status(500).json({ success: false, error: "Server error" });
  }
};

/**
 * @desc Update action item (Whitelisted fields, explicit state transitions)
 */
export const updateActionItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = req.actionItem; // Populated by verifyActionItemAccess

    // Whitelist mutable fields
    const allowedFields = [
      "status",
      "assignee",
      "deadline",
      "priority",
      "title",
      "description",
    ];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    // Explicit state transitions
    if (updates.status) {
      if (updates.status === "completed" && item.status !== "completed") {
        updates.completedAt = new Date();
      } else if (updates.status !== "completed") {
        updates.completedAt = null;
      }

      // Auto-mark overdue if deadline passed and not completed/cancelled
      if (
        updates.deadline &&
        new Date(updates.deadline) < new Date() &&
        !["completed", "cancelled"].includes(updates.status)
      ) {
        updates.status = "overdue";
      }
    }

    const updatedItem = await ActionItem.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).populate("assignee", "name avatar");

    res.status(200).json({ success: true, data: updatedItem });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

/**
 * @desc Delete an action item
 */
export const deleteActionItem = async (req, res) => {
  try {
    await ActionItem.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: {} });
  } catch (_error) {
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// Helper to get meeting IDs for an org (simplified)
async function getOrgMeetingIds(orgId) {
  const Meeting = (await import("../models/meetingModel.js")).default;
  const meetings = await Meeting.find({ organizationId: orgId }).select("_id");
  return meetings.map((m) => m._id);
}
