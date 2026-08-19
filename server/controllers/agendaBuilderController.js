// server/controllers/agendaBuilderController.js
/**
 * Agenda Builder Controller
 *
 * Provides endpoints for listing, creating, voting, reordering, and finalizing meeting agendas.
 * Enforces meeting existence and organization access verification to protect against IDOR vulnerabilities.
 */

import Meeting from "../models/meetingModel.js";

/**
 * Helper to validate authorization for accessing a meeting.
 * Ensures the authenticated user is either the direct uploader or belongs to the meeting's host organization.
 *
 * @param {Object} meeting
 * @param {Object} user
 * @returns {boolean}
 */
export const checkMeetingOrgAccess = (meeting, user) => {
  if (!meeting || !user) return false;

  const userId = user._id?.toString() || user.id?.toString();
  const userOrgId =
    user.organization?.toString() || user.organizationId?.toString();
  const meetingOrgId = meeting.organization?.toString();
  const uploaderId = meeting.uploadedBy?.toString();

  if (uploaderId && userId && uploaderId === userId) {
    return true;
  }

  if (meetingOrgId && userOrgId && meetingOrgId === userOrgId) {
    return true;
  }

  return false;
};

/**
 * Middleware function to enforce meeting and organization authorization on agenda builder endpoints.
 */
export const verifyMeetingOrgAccess = async (req, res, next) => {
  try {
    const meetingId =
      req.params.meetingId || req.body?.meetingId || req.query?.meetingId;

    if (
      !meetingId ||
      typeof meetingId !== "string" ||
      !/^[0-9a-fA-F]{24}$/.test(meetingId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid meetingId format.",
      });
    }

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found.",
      });
    }

    if (!checkMeetingOrgAccess(meeting, req.user)) {
      return res.status(403).json({
        success: false,
        message:
          "Unauthorized: You do not have permission to view or modify agendas for this meeting.",
      });
    }

    req.meeting = meeting;
    next();
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/agenda-builder/:meetingId
 * List agenda items for a meeting.
 */
export const getAgendas = async (req, res, next) => {
  try {
    const meeting = req.meeting;
    return res.status(200).json({
      success: true,
      agendaItems: meeting.agendaItems || [],
      meetingId: meeting._id.toString(),
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/agenda-builder/:meetingId/items
 * Create a new agenda item.
 */
export const createAgendaItem = async (req, res, next) => {
  try {
    const meeting = req.meeting;
    const { text, title, duration } = req.body || {};
    const itemText = text || title;

    if (!itemText || typeof itemText !== "string" || !itemText.trim()) {
      return res.status(400).json({
        success: false,
        message: "Agenda item text or title is required.",
      });
    }

    const newItem = {
      text: itemText.trim(),
      duration: duration || null,
      createdBy: req.user._id,
      votes: 0,
      votedUsers: [],
    };

    meeting.agendaItems.push(newItem);
    await meeting.save();

    return res.status(201).json({
      success: true,
      message: "Agenda item added successfully.",
      agendaItems: meeting.agendaItems,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/agenda-builder/:meetingId/items/:itemId/vote
 * Vote on an agenda item.
 */
export const voteAgendaItem = async (req, res, next) => {
  try {
    const meeting = req.meeting;
    const itemId = req.params.itemId || req.body?.itemId;

    if (!itemId) {
      return res.status(400).json({
        success: false,
        message: "itemId is required to cast vote.",
      });
    }

    const agendaItem = meeting.agendaItems.id
      ? meeting.agendaItems.id(itemId)
      : meeting.agendaItems.find((item) => item._id?.toString() === itemId);

    if (!agendaItem) {
      return res.status(404).json({
        success: false,
        message: "Agenda item not found.",
      });
    }

    agendaItem.votes = (agendaItem.votes || 0) + 1;
    await meeting.save();

    return res.status(200).json({
      success: true,
      message: "Vote cast successfully.",
      agendaItems: meeting.agendaItems,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * PUT /api/agenda-builder/:meetingId/reorder
 * Reorder agenda items for a meeting.
 */
export const reorderAgendaItems = async (req, res, next) => {
  try {
    const meeting = req.meeting;
    const { agendaItems, orderedIds } = req.body || {};

    if (Array.isArray(agendaItems)) {
      meeting.agendaItems = agendaItems;
    } else if (Array.isArray(orderedIds)) {
      const itemMap = new Map(
        meeting.agendaItems.map((item) => [item._id?.toString(), item]),
      );
      meeting.agendaItems = orderedIds
        .map((id) => itemMap.get(id))
        .filter(Boolean);
    } else {
      return res.status(400).json({
        success: false,
        message: "Array of agendaItems or orderedIds is required to reorder.",
      });
    }

    await meeting.save();

    return res.status(200).json({
      success: true,
      message: "Agenda items reordered successfully.",
      agendaItems: meeting.agendaItems,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/agenda-builder/:meetingId/finalize
 * Finalize agenda for a meeting.
 */
export const finalizeAgenda = async (req, res, next) => {
  try {
    const meeting = req.meeting;

    meeting.isAgendaFinalized = true;
    await meeting.save();

    return res.status(200).json({
      success: true,
      message: "Agenda finalized successfully.",
      agendaItems: meeting.agendaItems,
      isAgendaFinalized: true,
    });
  } catch (err) {
    return next(err);
  }
};
