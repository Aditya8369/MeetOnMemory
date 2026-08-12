import express from "express";
import Meeting from "../models/meetingModel.js";
import {
  getMeetingHealth,
  getOrganizationHealthTrends,
} from "../controllers/meetingHealthController.js";
import userAuth from "../middleware/userAuth.js";
import {
  requireOrgAccess,
  requireOrgMembership,
  requireOrganizationParamMatch,
  requirePermission,
  requireRole,
} from "../middleware/rbac.js";

const router = express.Router();

// Require authentication for all routes
router.use(userAuth);

// Organization-wide trends MUST be registered before "/:meetingId"
// so "trends" is not captured as a meeting id.
//
// Issue #1380 authorization chain:
//   userAuth → org membership → admin/manager role → path org matches membership
// Controllers then query with req.authorizedOrganizationId only.
router.get(
  "/trends/:organizationId",
  requireOrgMembership,
  requireRole(["admin", "manager"]),
  requireOrganizationParamMatch("organizationId"),
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
