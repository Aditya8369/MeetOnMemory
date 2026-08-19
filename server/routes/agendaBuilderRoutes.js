// server/routes/agendaBuilderRoutes.js
import express from "express";
import userAuth from "../middleware/userAuth.js";
import {
  verifyMeetingOrgAccess,
  getAgendas,
  createAgendaItem,
  voteAgendaItem,
  reorderAgendaItems,
  finalizeAgenda,
} from "../controllers/agendaBuilderController.js";

const router = express.Router();

// Enforce user authentication middleware across all agenda builder endpoints
router.use(userAuth);

// Agenda Builder Routes with meeting and organization authorization
router.get("/:meetingId", verifyMeetingOrgAccess, getAgendas);
router.post("/:meetingId/items", verifyMeetingOrgAccess, createAgendaItem);
router.post(
  "/:meetingId/items/:itemId/vote",
  verifyMeetingOrgAccess,
  voteAgendaItem,
);
router.put("/:meetingId/reorder", verifyMeetingOrgAccess, reorderAgendaItems);
router.post("/:meetingId/reorder", verifyMeetingOrgAccess, reorderAgendaItems);
router.post("/:meetingId/finalize", verifyMeetingOrgAccess, finalizeAgenda);

export default router;
