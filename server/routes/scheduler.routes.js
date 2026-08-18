import express from "express";
import userAuth from "../middleware/userAuth.js";
import { requireOrgMembership, requirePermission } from "../middleware/rbac.js";
import {
  createProposal,
  getProposal,
  confirmProposal,
} from "../controllers/schedulerController.js";

const router = express.Router();

/**
 * Smart Scheduler routes (Issue #1530).
 * Mounted at /api/scheduler — Clerk auth + org membership + meetings:create.
 */
router.use(userAuth);
router.use(requireOrgMembership);
router.use(requirePermission("meetings", "create"));

router.post("/propose", createProposal);
router.get("/propose/:id", getProposal);
router.put("/propose/:id/confirm", confirmProposal);

export default router;
