import express from "express";
import userAuth from "../middleware/userAuth.js";
import { requirePermission } from "../middleware/rbac.js";
import {
  compareMeetings,
  getComparableMeetings,
} from "../controllers/comparisonController.js";

const router = express.Router();

// Issue #1403: Clerk auth + meetings:view, then per-meeting authorization in controllers.
router.post(
  "/compare",
  userAuth,
  requirePermission("meetings", "view"),
  compareMeetings,
);
router.get(
  "/comparable/:meetingId",
  userAuth,
  requirePermission("meetings", "view"),
  getComparableMeetings,
);

export default router;
