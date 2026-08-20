import express from "express";
import {
  getPolicy,
  updatePolicy,
  getSweepPreview,
  triggerSweep,
} from "../controllers/dataRetentionController.js";
import userAuth from "../middleware/userAuth.js";
import { apiLimiter, writeLimiter } from "../middleware/rateLimiter.js";
import { requireOrgMembership, requirePermission } from "../middleware/rbac.js";

const router = express.Router();

router.use(apiLimiter);

// For all routes, ensure the user is part of the organization
// and has permission to update organization settings
router.get(
  "/:organizationId",
  userAuth,
  requireOrgMembership,
  requirePermission("organizations", "update"),
  getPolicy,
);

router.put(
  "/:organizationId",
  userAuth,
  writeLimiter,
  requireOrgMembership,
  requirePermission("organizations", "update"),
  updatePolicy,
);

router.get(
  "/:organizationId/preview",
  userAuth,
  requireOrgMembership,
  requirePermission("organizations", "update"),
  getSweepPreview,
);

router.post(
  "/:organizationId/trigger",
  userAuth,
  writeLimiter,
  requireOrgMembership,
  requirePermission("organizations", "update"),
  triggerSweep,
);

export default router;
