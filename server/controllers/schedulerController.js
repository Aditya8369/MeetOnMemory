import mongoose from "mongoose";
import MeetingProposal from "../models/MeetingProposal.js";
import Meeting from "../models/meetingModel.js";
import User from "../models/userModel.js";
import SmartScheduler from "../services/smartScheduler.js";
import { createGoogleEvent } from "../services/calendarService.js";

const resolveOrgId = (user) =>
  (user?.organization?._id || user?.organization)?.toString?.() || null;

/**
 * Ensure participant IDs belong to the organizer's organization (#1530).
 */
const loadAuthorizedParticipants = async (participantIds, organizationId) => {
  if (!Array.isArray(participantIds) || participantIds.length === 0) {
    return { error: { status: 400, message: "participantIds are required" } };
  }

  const invalid = participantIds.some((id) => !mongoose.isValidObjectId(id));
  if (invalid) {
    return { error: { status: 400, message: "Invalid participant ID" } };
  }

  const query = { _id: { $in: participantIds } };
  if (organizationId) {
    query.organization = organizationId;
  }

  const participants = await User.find(query).select("name email organization");

  if (participants.length !== participantIds.length) {
    return {
      error: {
        status: 403,
        message:
          "Forbidden: One or more participants are outside your organization",
      },
    };
  }

  return { participants };
};

/**
 * @desc Generate smart meeting proposals
 * @route POST /api/scheduler/propose
 */
export const createProposal = async (req, res) => {
  try {
    const { title, participantIds, duration, dateRange, preferences } =
      req.body;

    if (!title || typeof title !== "string") {
      return res
        .status(400)
        .json({ success: false, error: "title is required" });
    }

    if (
      !dateRange?.start ||
      !dateRange?.end ||
      Number.isNaN(Date.parse(dateRange.start)) ||
      Number.isNaN(Date.parse(dateRange.end))
    ) {
      return res.status(400).json({
        success: false,
        error: "dateRange.start and dateRange.end are required",
      });
    }

    const organizationId = resolveOrgId(req.user);
    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Organization membership required",
      });
    }

    // Default to organizer-only when the client omits participants.
    const requestedIds =
      Array.isArray(participantIds) && participantIds.length > 0
        ? participantIds.map(String)
        : [req.user._id.toString()];

    // Always include the organizer
    const uniqueIds = [...new Set([req.user._id.toString(), ...requestedIds])];

    const loaded = await loadAuthorizedParticipants(uniqueIds, organizationId);
    if (loaded.error) {
      return res.status(loaded.error.status).json({
        success: false,
        error: loaded.error.message,
      });
    }

    const meetingDuration = Number(duration) || 30;
    const prefs = preferences || { avoidWeekends: true };

    const proposedSlots = await SmartScheduler.generateProposals({
      participants: loaded.participants,
      duration: meetingDuration,
      dateRange: {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end),
      },
      preferences: prefs,
      organizerUserId: req.user._id,
    });

    const proposal = await MeetingProposal.create({
      title: title.trim(),
      organizer: req.user._id,
      organization: organizationId,
      participants: loaded.participants.map((p) => p._id),
      duration: meetingDuration,
      dateRange: {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end),
      },
      proposedSlots,
      preferences: prefs,
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
};

/**
 * @desc Get a proposal the caller is authorized to view
 * @route GET /api/scheduler/propose/:id
 */
export const getProposal = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid proposal ID" });
    }

    const proposal = await MeetingProposal.findById(id)
      .populate("participants", "name email")
      .populate("organizer", "name email");

    if (!proposal) {
      return res
        .status(404)
        .json({ success: false, error: "Proposal not found" });
    }

    const organizationId = resolveOrgId(req.user);
    const organizerId =
      proposal.organizer?._id?.toString() || proposal.organizer?.toString();
    const isOrganizer = organizerId === req.user._id.toString();

    const participantIds = (proposal.participants || []).map((p) =>
      (p._id || p).toString(),
    );
    const isParticipant = participantIds.includes(req.user._id.toString());

    const sameOrg =
      organizationId &&
      proposal.organization &&
      proposal.organization.toString() === organizationId;

    if ((!isOrganizer && !isParticipant) || !sameOrg) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: You don't have access to this proposal",
      });
    }

    res.status(200).json({ success: true, data: proposal });
  } catch (error) {
    console.error("Get proposal error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch proposal" });
  }
};

/**
 * @desc Confirm a selected slot, persist Meeting, optionally create calendar event
 * @route PUT /api/scheduler/propose/:id/confirm
 */
export const confirmProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const { startTime, endTime } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid proposal ID" });
    }

    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: "startTime and endTime are required",
      });
    }

    const proposal = await MeetingProposal.findById(id).populate(
      "participants",
      "email name",
    );

    if (!proposal) {
      return res
        .status(404)
        .json({ success: false, error: "Proposal not found" });
    }

    if (proposal.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Only the organizer can confirm this proposal",
      });
    }

    const organizationId = resolveOrgId(req.user);
    if (
      !organizationId ||
      !proposal.organization ||
      proposal.organization.toString() !== organizationId
    ) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Cross-organization confirmation denied",
      });
    }

    if (proposal.status === "confirmed" && proposal.meetingId) {
      return res.status(200).json({ success: true, data: proposal });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const timeStr = start.toISOString().slice(11, 16);

    const meeting = await Meeting.create({
      title: proposal.title,
      description: "Scheduled via MeetOnMemory Smart Scheduler",
      date: start,
      time: timeStr,
      duration: proposal.duration,
      uploadedBy: req.user._id,
      organization: proposal.organization,
      participants: (proposal.participants || []).map((p) => ({
        user: p._id,
        name: p.name || "Participant",
        email: p.email || "",
      })),
      meetingType: "internal",
    });

    // Best-effort calendar sync — failure must not roll back the meeting.
    try {
      await createGoogleEvent(req.user._id, {
        title: proposal.title,
        description: "Scheduled via MeetOnMemory Smart Scheduler",
        date: start,
        duration: proposal.duration,
        participants: proposal.participants,
      });
    } catch (calErr) {
      console.warn(
        "[scheduler] Calendar event creation skipped:",
        calErr.message,
      );
    }

    proposal.selectedSlot = { startTime: start, endTime: end };
    proposal.status = "confirmed";
    proposal.meetingId = meeting._id;
    await proposal.save();

    res.status(200).json({
      success: true,
      data: proposal,
      meetingId: meeting._id,
    });
  } catch (error) {
    console.error("Confirm error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to confirm meeting" });
  }
};
