import * as agendaVoteService from "../services/agendaVoteService.js";

/**
 * Cast or update a vote
 * POST /api/meetings/:meetingId/agenda-votes/:agendaItemId
 */
export const castVote = async (req, res) => {
  try {
    const { meetingId, agendaItemId } = req.params;
    const { vote } = req.body;
    const userId = req.user._id;

    if (![1, -1].includes(vote)) {
      return res
        .status(400)
        .json({ error: "Vote must be 1 (upvote) or -1 (downvote)" });
    }

    const newVote = await agendaVoteService.castVote(
      meetingId,
      agendaItemId,
      userId,
      vote,
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
    const userId = req.user._id;

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
    const tally = await agendaVoteService.getVoteTally(meetingId);
    res.status(200).json({ tally });
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
    // Host validation should ideally happen here or in a middleware
    const updatedAgenda = await agendaVoteService.autoSortByVotes(meetingId);

    const io = req.app.get("io");
    if (io) {
      io.to(meetingId).emit("agenda:updated", {
        meetingId,
        agendaItems: updatedAgenda,
      });
    }

    res
      .status(200)
      .json({
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
