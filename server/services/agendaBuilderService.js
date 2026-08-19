import AgendaProposal from "../models/agendaProposalModel.js";
import Meeting from "../models/meetingModel.js";
import { generateAgendaSuggestions } from "./GenerativeAIService.js";

export const getProposals = async (meetingId) => {
  return await AgendaProposal.find({ meetingId }).sort({
    position: 1,
    createdAt: 1,
  });
};

export const createProposal = async (meetingId, data) => {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    throw new Error("Meeting not found");
  }

  const newProposal = new AgendaProposal({
    meetingId,
    proposedBy: data.proposedBy || null,
    text: data.text,
    description: data.description || "",
    estimatedDuration: data.estimatedDuration || 15,
    source: data.source || "participant",
    sourceId: data.sourceId || null,
  });

  return await newProposal.save();
};

export const voteProposal = async (proposalId, userId, voteValue) => {
  const proposal = await AgendaProposal.findById(proposalId);
  if (!proposal) {
    throw new Error("Proposal not found");
  }

  const hasVoted = proposal.voters.includes(userId);

  if (voteValue > 0) {
    if (!hasVoted) {
      proposal.voters.push(userId);
      proposal.voteScore += 1;
    }
  } else {
    if (hasVoted) {
      proposal.voters = proposal.voters.filter(
        (id) => id.toString() !== userId.toString(),
      );
      proposal.voteScore -= 1;
    }
  }

  return await proposal.save();
};

export const updateProposalStatus = async (proposalId, status) => {
  if (!["proposed", "accepted", "rejected"].includes(status)) {
    throw new Error("Invalid status");
  }
  const proposal = await AgendaProposal.findByIdAndUpdate(
    proposalId,
    { status },
    { new: true },
  );
  if (!proposal) {
    throw new Error("Proposal not found");
  }
  return proposal;
};

export const reorderProposals = async (meetingId, orderedIds) => {
  const bulkOps = orderedIds.map((id, index) => ({
    updateOne: {
      filter: { _id: id, meetingId },
      update: { position: index },
    },
  }));

  if (bulkOps.length > 0) {
    await AgendaProposal.bulkWrite(bulkOps);
  }
  return await getProposals(meetingId);
};

export const generateAiProposals = async (meetingId, contextData) => {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    throw new Error("Meeting not found");
  }

  const suggestions = await generateAgendaSuggestions(contextData);

  const proposals = suggestions.map((s) => ({
    meetingId,
    text: s.text,
    description: s.description || "",
    estimatedDuration: s.estimatedDuration || 15,
    source: "ai",
    sourceId: s.sourceId || null,
  }));

  return await AgendaProposal.insertMany(proposals);
};

export const finalizeAgenda = async (meetingId) => {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    throw new Error("Meeting not found");
  }

  const acceptedProposals = await AgendaProposal.find({
    meetingId,
    status: "accepted",
  }).sort({ position: 1 });

  const formattedItems = acceptedProposals.map((proposal, index) => ({
    text: proposal.text,
    description: proposal.description,
    duration: proposal.estimatedDuration,
    position: index,
  }));

  meeting.agendaItems = formattedItems;
  await meeting.save();
  return meeting;
};
