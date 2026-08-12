import express from "express";
import Meeting from "../models/meetingModel.js";
import {
  getMeetingHealth,
  getOrganizationHealthTrends,
} from "../controllers/meetingHealthController.js";
import userAuth from "../middleware/userAuth.js";
import {
  requireOrgAccess,
  requirePermission,
  requireRole,
} from "../middleware/rbac.js";

const router = express.Router();

// Require authentication for all routes
router.use(userAuth);

// Organization-wide trends MUST be registered before "/:meetingId"
// so "trends" is not captured as a meeting id.
// Preserve existing admin/manager role gate; org scoping is enforced in the
// controller (Issue #1379).
router.get(
  "/trends/:organizationId",
  requireRole(["admin", "manager"]),
  getOrganizationHealthTrends,
);

// Issue #1379: resolve the meeting server-side and enforce org membership
// before any health read/calculation. Never trust meetingId alone.
router.get(
  "/:meetingId",
  requireOrgAccess(Meeting),
  requirePermission("meetings", "view"),
  getMeetingHealth,
);

export default router;
