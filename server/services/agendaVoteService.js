import mongoose from "mongoose";
import AgendaVote from "../models/agendaVoteModel.js";
import Meeting from "../models/meetingModel.js";
import { normalizeAgendaItems } from "../utils/agendaOrdering.js";

/**
 * Cast or update a vote for an agenda item.
 */
export const castVote = async (meetingId, agendaItemId, userId, vote) => {
  const existingVote = await AgendaVote.findOne({
    meetingId,
    agendaItemId,
    userId,
  });

  if (existingVote) {
    if (existingVote.vote === vote) {
      return existingVote; // No change
    }
    existingVote.vote = vote;
    await existingVote.save();
    return existingVote;
  }

  const newVote = await AgendaVote.create({
    meetingId,
    agendaItemId,
    userId,
    vote,
  });

  return newVote;
};

/**
 * Remove a user's vote for an agenda item.
 */
export const removeVote = async (meetingId, agendaItemId, userId) => {
  await AgendaVote.findOneAndDelete({
    meetingId,
    agendaItemId,
    userId,
  });
};

/**
 * Get the vote tally for all agenda items in a meeting.
 * Returns an object mapping agendaItemId to net vote count.
 */
export const getVoteTally = async (meetingId) => {
  const meetingObjectId =
    typeof meetingId === "string" && mongoose.Types.ObjectId.isValid(meetingId)
      ? new mongoose.Types.ObjectId(meetingId)
      : meetingId;

  const tallies = await AgendaVote.aggregate([
    { $match: { meetingId: meetingObjectId } },
    {
      $group: {
        _id: "$agendaItemId",
        netVotes: { $sum: "$vote" },
      },
    },
  ]);

  const tallyMap = {};
  for (const t of tallies) {
    tallyMap[t._id.toString()] = t.netVotes;
  }
  return tallyMap;
};

/**
 * Auto-sort agenda items based on vote count descending.
 */
export const autoSortByVotes = async (meetingId) => {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    throw new Error("Meeting not found");
  }

  // Only allow sorting before the meeting starts processing
  if (meeting.status && meeting.status !== "uploaded") {
    throw new Error(
      "Agenda cannot be auto-sorted after meeting has started processing",
    );
  }

  const tallies = await getVoteTally(meeting._id);

  // Sort agendaItems in-place
  meeting.agendaItems.sort((a, b) => {
    const votesA = tallies[a._id.toString()] || 0;
    const votesB = tallies[b._id.toString()] || 0;

    // Sort descending by votes
    if (votesA !== votesB) {
      return votesB - votesA;
    }

    // Fallback to original position
    return (a.position || 0) - (b.position || 0);
  });

  // Re-normalize positions to be 0-based sequential
  meeting.agendaItems = normalizeAgendaItems(meeting.agendaItems);

  await meeting.save();
  return meeting.agendaItems;
};
