import express from "express";
import userAuth from "../middleware/userAuth.js";
import { requireOrgMembership, requirePermission } from "../middleware/rbac.js";
import {
  getConfig,
  updateConfig,
  getPreview,
  applyCarryForward,
  getMeetingPreview,
  applyMeetingCarryForward,
  getHistory,
} from "../controllers/carryForwardController.js";

const router = express.Router();

router.use(userAuth);
router.use(requireOrgMembership);

// --- Original Routes (Relative to mount point: /api/meeting-series) ---
router.get(
  "/:seriesId/carry-forward/config",
  requirePermission("meetings", "view"),
  getConfig,
);

router.put(
  "/:seriesId/carry-forward/config",
  requirePermission("meetings", "edit"),
  updateConfig,
);

router.get(
  "/:seriesId/carry-forward/preview",
  requirePermission("meetings", "view"),
  getPreview,
);

router.post(
  "/:seriesId/carry-forward/apply",
  requirePermission("meetings", "edit"),
  applyCarryForward,
);

// --- New Routes (Relative to mount point: /api) ---
router.get(
  "/meetings/:meetingId/carry-forward/preview",
  requirePermission("meetings", "view"),
  getMeetingPreview,
);

router.post(
  "/meetings/:meetingId/carry-forward/apply",
  requirePermission("meetings", "edit"),
  applyMeetingCarryForward,
);

router.get(
  "/series/:seriesId/carry-forward/history",
  requirePermission("meetings", "view"),
  getHistory,
);

export default router;
