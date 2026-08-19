import express from "express";
import userAuth from "../middleware/userAuth.js";
import * as agendaBuilderController from "../controllers/agendaBuilderController.js";

const router = express.Router({ mergeParams: true }); // Need mergeParams to access :meetingId if mounted appropriately, or just expect it in path

// Protect all routes
router.use(userAuth);

// Routes for /api/meetings/:meetingId/agenda-builder
router.get(
  "/:meetingId/agenda-builder/proposals",
  agendaBuilderController.getProposals,
);
router.post(
  "/:meetingId/agenda-builder/proposals",
  agendaBuilderController.createProposal,
);
router.post(
  "/:meetingId/agenda-builder/proposals/:proposalId/vote",
  agendaBuilderController.voteProposal,
);
router.put(
  "/:meetingId/agenda-builder/proposals/:proposalId/status",
  agendaBuilderController.updateStatus,
);
router.put(
  "/:meetingId/agenda-builder/proposals/reorder",
  agendaBuilderController.reorderProposals,
);
router.post(
  "/:meetingId/agenda-builder/ai-suggest",
  agendaBuilderController.generateAiProposals,
);
router.post(
  "/:meetingId/agenda-builder/finalize",
  agendaBuilderController.finalizeAgenda,
);

export default router;
