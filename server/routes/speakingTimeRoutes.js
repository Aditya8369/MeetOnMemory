import express from "express";
import {
  getSpeakingTimeBreakdown,
  getSpeakingTimeTrends,
  getSpeakingTimeOrgCompare,
} from "../controllers/speakingTimeController.js";
import userAuth from "../middleware/userAuth.js";
import { requirePermission } from "../middleware/rbac.js";

const router = express.Router();

// Get overall trends for the logged-in user
router.get("/trends", userAuth, getSpeakingTimeTrends);

// Get organization comparison stats for managers/admins
router.get(
  "/org-compare",
  userAuth,
  requirePermission("reports", "view"),
  getSpeakingTimeOrgCompare,
);

// Get speaking time breakdown for a specific meeting
router.get("/:meetingId/breakdown", userAuth, getSpeakingTimeBreakdown);

export default router;
