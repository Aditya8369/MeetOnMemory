import * as agendaVoteService from "../services/agendaVoteService.js";
import { resolveAccessibleMeeting } from "../utils/resolveAccessibleMeeting.js";

/**
 * Helper to determine if a user is a host or admin for a meeting.
 */
const isHostOrAdmin = (meeting, user) => {
  if (!meeting || !user) return false;

  const userIdStr = user._id
    ? user._id.toString()
    : user.id
      ? user.id.toString()
      : null;

  // Check if meeting owner / uploader
  if (
    meeting.uploadedBy &&
    userIdStr &&
    meeting.uploadedBy.toString() === userIdStr
  ) {
    return true;
  }

  // Check if organization admin or system owner
  if (user.role === "admin" || user.role === "owner") {
    return true;
  }

  // Check if meeting participant with host / co-host / admin / organizer role
  if (Array.isArray(meeting.participants)) {
    const participant = meeting.participants.find(
      (p) =>
        (p.user && userIdStr && p.user.toString() === userIdStr) ||
        (p.email &&
          user.email &&
          p.email.toLowerCase() === user.email.toLowerCase()),
    );
    if (participant && participant.role) {
      const roleLower = participant.role.toLowerCase();
      if (["host", "co-host", "admin", "organizer"].includes(roleLower)) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Cast or update a vote
 * POST /api/meetings/:meetingId/agenda-votes/:agendaItemId
 */
export const castVote = async (req, res) => {
  try {
    const { meetingId, agendaItemId } = req.params;
    const { vote } = req.body;
    const userId = req.user._id || req.user.id;

    if (![1, -1].includes(Number(vote))) {
      return res
        .status(400)
        .json({ error: "Vote must be 1 (upvote) or -1 (downvote)" });
    }

    const access = await resolveAccessibleMeeting(meetingId, req.user);
    if (access.error) {
      return res
        .status(access.error.status)
        .json({ error: access.error.message });
    }

    const newVote = await agendaVoteService.castVote(
      meetingId,
      agendaItemId,
      userId,
      Number(vote),
    );
    const updatedTally = await agendaVoteService.getVoteTally(meetingId);

    const io = req.app.get("io");
    if (io) {
      io.to(meetingId).emit("agenda:vote:updated", {
        meetingId,
        tally: updatedTally,
      });
    }

    res.status(200).json({ vote: newVote, tally: updatedTally });
  } catch (error) {
    console.error("Error casting vote:", error);
    res.status(500).json({ error: "Failed to cast vote" });
  }
};

/**
 * Remove a vote
 * DELETE /api/meetings/:meetingId/agenda-votes/:agendaItemId
 */
export const removeVote = async (req, res) => {
  try {
    const { meetingId, agendaItemId } = req.params;
    const userId = req.user._id || req.user.id;

    const access = await resolveAccessibleMeeting(meetingId, req.user);
    if (access.error) {
      return res
        .status(access.error.status)
        .json({ error: access.error.message });
    }

    await agendaVoteService.removeVote(meetingId, agendaItemId, userId);
    const updatedTally = await agendaVoteService.getVoteTally(meetingId);

    const io = req.app.get("io");
    if (io) {
      io.to(meetingId).emit("agenda:vote:updated", {
        meetingId,
        tally: updatedTally,
      });
    }

    res.status(200).json({ message: "Vote removed", tally: updatedTally });
  } catch (error) {
    console.error("Error removing vote:", error);
    res.status(500).json({ error: "Failed to remove vote" });
  }
};

/**
 * Get all vote tallies for a meeting
 * GET /api/meetings/:meetingId/agenda-votes
 */
export const getVoteTally = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user._id || req.user.id;

    const access = await resolveAccessibleMeeting(meetingId, req.user);
    if (access.error) {
      return res
        .status(access.error.status)
        .json({ error: access.error.message });
    }

    const tally = await agendaVoteService.getVoteTally(meetingId);
    const userVotes = await agendaVoteService.getUserVotes(meetingId, userId);
    res.status(200).json({ tally, userVotes });
  } catch (error) {
    console.error("Error fetching vote tally:", error);
    res.status(500).json({ error: "Failed to fetch vote tally" });
  }
};

/**
 * Auto-sort agenda by votes
 * POST /api/meetings/:meetingId/agenda-votes/auto-sort
 */
export const autoSortByVotes = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const access = await resolveAccessibleMeeting(meetingId, req.user);
    if (access.error) {
      return res
        .status(access.error.status)
        .json({ error: access.error.message });
    }

    const meeting = access.meeting;

    if (!isHostOrAdmin(meeting, req.user)) {
      return res.status(403).json({
        error:
          "Forbidden: Only meeting hosts or admins can auto-sort the agenda",
      });
    }

    const updatedAgenda = await agendaVoteService.autoSortByVotes(meetingId);

    const io = req.app.get("io");
    if (io) {
      io.to(meetingId).emit("agenda:updated", {
        meetingId,
        agendaItems: updatedAgenda,
      });
    }

    res.status(200).json({
      message: "Agenda sorted successfully",
      agendaItems: updatedAgenda,
    });
  } catch (error) {
    console.error("Error auto-sorting agenda:", error);
    res
      .status(400)
      .json({ error: error.message || "Failed to auto-sort agenda" });
  }
};
