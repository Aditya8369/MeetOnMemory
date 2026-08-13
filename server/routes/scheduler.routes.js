const express = require("express");
const router = express.Router();
const MeetingProposal = require("../models/MeetingProposal");
const SmartScheduler = require("../services/smartScheduler");
const calendarService = require("../services/calendarService");
const { protect } = require("../middleware/authMiddleware");
const User = require("../models/User");

router.use(protect);

/**
 * @route   POST /api/scheduler/propose
 * @desc    Generate smart meeting proposals based on participant availability
 */
router.post("/propose", async (req, res) => {
  try {
    const { title, participantIds, duration, dateRange, preferences } =
      req.body;
    const organizerId = req.user.id;

    // Fetch participant details (emails needed for calendar API)
    const participants = await User.find({
      _id: { $in: participantIds },
    }).select("name email");

    // For demo, using organizer's token. In production, use a service account or OAuth delegation.
    const organizerToken = req.user.calendarToken;

    if (!organizerToken) {
      return res.status(400).json({
        success: false,
        error:
          "Calendar not connected. Please connect Google Calendar in settings.",
      });
    }

    // Run the scheduling algorithm
    const proposedSlots = await SmartScheduler.generateProposals({
      participants,
      duration,
      dateRange: {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end),
      },
      preferences: preferences || { avoidWeekends: true },
      organizerToken,
    });

    // Save the proposal to DB
    const proposal = await MeetingProposal.create({
      title,
      organizer: organizerId,
      participants: participantIds,
      duration,
      dateRange,
      proposedSlots,
      preferences,
      status: "proposed",
    });

    res.status(201).json({
      success: true,
      data: proposal,
    });
  } catch (error) {
    console.error("Scheduler error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate proposals",
    });
  }
});

/**
 * @route   PUT /api/scheduler/propose/:id/confirm
 * @desc    Confirm a selected slot and send calendar invites
 */
router.put("/propose/:id/confirm", async (req, res) => {
  try {
    const { id } = req.params;
    const { startTime, endTime } = req.body;
    const organizerToken = req.user.calendarToken;

    const proposal = await MeetingProposal.findById(id).populate(
      "participants",
      "email name",
    );
    if (!proposal)
      return res
        .status(404)
        .json({ success: false, error: "Proposal not found" });

    // Create the actual calendar event
    await calendarService.createEvent(
      "google",
      {
        title: proposal.title,
        description: "Scheduled via MeetOnMemory Smart Scheduler",
        startTime,
        endTime,
        attendees: proposal.participants.map((p) => p.email),
      },
      organizerToken,
    );

    // Update proposal status
    proposal.selectedSlot = { startTime, endTime };
    proposal.status = "confirmed";
    await proposal.save();

    res.status(200).json({ success: true, data: proposal });
  } catch (error) {
    console.error("Confirm error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to confirm meeting" });
  }
});

module.exports = router;
