import * as agendaBuilderService from "../services/agendaBuilderService.js";
import { emitToMeeting } from "../socket/meetingSocket.js";

export const getProposals = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const proposals = await agendaBuilderService.getProposals(meetingId);
    res.json(proposals);
  } catch (error) {
    console.error("Error in getProposals:", error);
    res.status(500).json({ error: error.message });
  }
};

export const createProposal = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const data = {
      ...req.body,
      proposedBy: req.user._id, // Assuming auth middleware sets req.user
    };
    const proposal = await agendaBuilderService.createProposal(meetingId, data);

    emitToMeeting(meetingId, "agenda:proposal:new", proposal);

    res.status(201).json(proposal);
  } catch (error) {
    console.error("Error in createProposal:", error);
    res.status(500).json({ error: error.message });
  }
};

export const voteProposal = async (req, res) => {
  try {
    const { proposalId } = req.params;
    const { voteValue } = req.body;

    const proposal = await agendaBuilderService.voteProposal(
      proposalId,
      req.user._id,
      voteValue,
    );

    emitToMeeting(proposal.meetingId, "agenda:proposal:updated", proposal);

    res.json(proposal);
  } catch (error) {
    console.error("Error in voteProposal:", error);
    res.status(500).json({ error: error.message });
  }
};

export const updateStatus = async (req, res) => {
  try {
    const { proposalId } = req.params;
    const { status } = req.body;

    const proposal = await agendaBuilderService.updateProposalStatus(
      proposalId,
      status,
    );

    emitToMeeting(proposal.meetingId, "agenda:proposal:updated", proposal);

    res.json(proposal);
  } catch (error) {
    console.error("Error in updateStatus:", error);
    res.status(500).json({ error: error.message });
  }
};

export const reorderProposals = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { orderedIds } = req.body;

    const proposals = await agendaBuilderService.reorderProposals(
      meetingId,
      orderedIds,
    );

    emitToMeeting(meetingId, "agenda:proposals:reordered", proposals);

    res.json(proposals);
  } catch (error) {
    console.error("Error in reorderProposals:", error);
    res.status(500).json({ error: error.message });
  }
};

export const generateAiProposals = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { contextData } = req.body;

    const proposals = await agendaBuilderService.generateAiProposals(
      meetingId,
      contextData,
    );

    // Emit individually or as a batch
    emitToMeeting(meetingId, "agenda:proposals:batch", proposals);

    res.status(201).json(proposals);
  } catch (error) {
    console.error("Error in generateAiProposals:", error);
    res.status(500).json({ error: error.message });
  }
};

export const finalizeAgenda = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const meeting = await agendaBuilderService.finalizeAgenda(meetingId);

    emitToMeeting(meetingId, "agenda:finalized", meeting.agendaItems);

    res.json({
      message: "Agenda finalized successfully",
      agendaItems: meeting.agendaItems,
    });
  } catch (error) {
    console.error("Error in finalizeAgenda:", error);
    res.status(500).json({ error: error.message });
  }
};
