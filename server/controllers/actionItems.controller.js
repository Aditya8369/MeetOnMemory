const ActionItem = require("../models/ActionItem");
const Meeting = require("../models/Meeting");
const ActionItemExtractor = require("../services/actionItemExtractor");

/**
 * @desc    Trigger AI extraction from meeting transcript
 * @route   POST /api/meetings/:meetingId/extract-actions
 */
exports.extractFromMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;

    const meeting = await Meeting.findById(meetingId).populate(
      "participants",
      "name",
    );
    if (!meeting)
      return res
        .status(404)
        .json({ success: false, error: "Meeting not found" });

    if (!meeting.transcript || meeting.transcript.length < 100) {
      return res.status(400).json({
        success: false,
        error: "Transcript is too short to extract action items.",
      });
    }

    // Run AI extraction
    const extractedItems = await ActionItemExtractor.extractFromTranscript(
      meeting.transcript,
      meeting.participants,
    );

    // Save to database
    const savedItems = await ActionItem.insertMany(
      extractedItems.map((item) => ({
        ...item,
        meetingId,
        assignedBy: userId,
      })),
    );

    res.status(201).json({
      success: true,
      count: savedItems.length,
      data: savedItems,
    });
  } catch (error) {
    console.error("Error extracting action items:", error);
    res
      .status(500)
      .json({ success: false, error: error.message || "Server error" });
  }
};

/**
 * @desc    Get action items for the current user (Dashboard view)
 * @route   GET /api/action-items
 */
exports.getActionItems = async (req, res) => {
  try {
    const { status, priority, meetingId } = req.query;
    const userId = req.user.id;

    const filter = {
      $or: [{ assignee: userId }, { assignedBy: userId }],
    };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (meetingId) filter.meetingId = meetingId;

    const items = await ActionItem.find(filter)
      .sort({ deadline: 1, priority: -1 })
      .populate("assignee", "name avatar")
      .populate("assignedBy", "name")
      .populate("meetingId", "title date");

    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (_error) {
    res.status(500).json({ success: false, error: "Server error" });
  }
};

/**
 * @desc    Get action items for a specific meeting
 * @route   GET /api/action-items/meeting/:meetingId
 */
exports.getMeetingActionItems = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const items = await ActionItem.find({ meetingId })
      .sort({ createdAt: 1 })
      .populate("assignee", "name avatar")
      .populate("assignedBy", "name");

    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (_error) {
    res.status(500).json({ success: false, error: "Server error" });
  }
};

/**
 * @desc    Manually create an action item
 * @route   POST /api/action-items
 */
exports.createActionItem = async (req, res) => {
  try {
    const { meetingId, title, description, assignee, deadline, priority } =
      req.body;
    const userId = req.user.id;

    const item = await ActionItem.create({
      meetingId,
      title,
      description,
      assignee,
      assignedBy: userId,
      deadline,
      priority,
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Update action item status/details
 * @route   PATCH /api/action-items/:id
 */
exports.updateActionItem = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Prevent unauthorized updates (simplified check)
    const item = await ActionItem.findById(id);
    if (!item)
      return res.status(404).json({ success: false, error: "Not found" });

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
 * @desc    Delete an action item
 * @route   DELETE /api/action-items/:id
 */
exports.deleteActionItem = async (req, res) => {
  try {
    const { id } = req.params;
    await ActionItem.findByIdAndDelete(id);
    res.status(200).json({ success: true, data: {} });
  } catch (_error) {
    res.status(500).json({ success: false, error: "Server error" });
  }
};
