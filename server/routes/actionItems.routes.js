const express = require("express");
const router = express.Router();
const actionItemsController = require("../controllers/actionItems.controller");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

/**
 * @route   POST /api/meetings/:meetingId/extract-actions
 * @desc    Trigger AI extraction of action items from a meeting transcript
 */
router.post(
  "/meetings/:meetingId/extract-actions",
  actionItemsController.extractFromMeeting,
);

/**
 * @route   GET /api/action-items
 * @desc    Get all action items for the current user (or all if admin) with filters
 */
router.get("/", actionItemsController.getActionItems);

/**
 * @route   GET /api/action-items/meeting/:meetingId
 * @desc    Get all action items for a specific meeting
 */
router.get("/meeting/:meetingId", actionItemsController.getMeetingActionItems);

/**
 * @route   POST /api/action-items
 * @desc    Manually create a new action item
 */
router.post("/", actionItemsController.createActionItem);

/**
 * @route   PATCH /api/action-items/:id
 * @desc    Update action item (status, assignee, deadline)
 */
router.patch("/:id", actionItemsController.updateActionItem);

/**
 * @route   DELETE /api/action-items/:id
 * @desc    Delete an action item
 */
router.delete("/:id", actionItemsController.deleteActionItem);

module.exports = router;
