import express from "express";
import {
  startAgendaItem,
  stopAgendaItem,
  skipAgendaItem,
  getAgendaPacingReport,
} from "../controllers/agendaTimerController.js";
import userAuth from "../middleware/userAuth.js";
import { requireOrgAccess, requirePermission } from "../middleware/rbac.js";
import Meeting from "../models/meetingModel.js";

const router = express.Router();

router.use(userAuth);

router.put("/:meetingId/agenda/:itemId/start", startAgendaItem);
router.put("/:meetingId/agenda/:itemId/stop", stopAgendaItem);
router.put("/:meetingId/agenda/:itemId/skip", skipAgendaItem);
router.get(
  "/:meetingId/pacing",
  requireOrgAccess(Meeting),
  requirePermission("meetings", "view"),
  getAgendaPacingReport,
);

export default router;
