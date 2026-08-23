import express from "express";
import * as decisionLogController from "../controllers/decisionLogController.js";
import { userAuth } from "../middleware/authMiddleware.js";
import { requirePermission } from "../middleware/rbacMiddleware.js";

const router = express.Router();

// Apply authentication to all routes
router.use(userAuth);

// Apply RBAC: Viewing requires knowledge.view
router.get(
  "/",
  requirePermission("knowledge", "view"),
  decisionLogController.getLogByOrg,
);

router.get(
  "/timeline",
  requirePermission("knowledge", "view"),
  decisionLogController.getDecisionTimeline,
);

router.get(
  "/overdue",
  requirePermission("knowledge", "view"),
  decisionLogController.getOverdueReviews,
);

// Editing/Creating requires knowledge.edit
router.post(
  "/",
  requirePermission("knowledge", "edit"),
  decisionLogController.createEntry,
);

router.put(
  "/:id/outcome",
  requirePermission("knowledge", "edit"),
  decisionLogController.updateOutcome,
);

router.put(
  "/:id/link-action-items",
  requirePermission("knowledge", "edit"),
  decisionLogController.linkActionItems,
);

export default router;
