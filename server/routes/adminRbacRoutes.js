import express from "express";
import userAuth from "../middleware/userAuth.js";
import { apiLimiter } from "../middleware/rateLimiter.js";
import { requireAdminOrOwner } from "../middleware/rbac.js";
import {
  PERMISSIONS,
  ROLE_HIERARCHY,
  getRoleDisplayName,
  getRoleDescription,
} from "../utils/rbacPermissions.js";
import { sendSuccess } from "../utils/responseHandler.js";

const router = express.Router();

// Enforce authentication, rate limiting, and admin/owner access
router.use(userAuth, apiLimiter, requireAdminOrOwner);

/**
 * GET /api/admin/rbac/matrix
 * Returns roles, hierarchy, and permissions matrix for admin audit/explorer UI
 */
router.get("/matrix", (req, res) => {
  const roles = Object.keys(ROLE_HIERARCHY).map((role) => ({
    key: role,
    name: getRoleDisplayName(role),
    description: getRoleDescription(role),
    level: ROLE_HIERARCHY[role],
  }));

  return sendSuccess(res, {
    data: {
      roles,
      roleHierarchy: ROLE_HIERARCHY,
      permissions: PERMISSIONS,
    },
  });
});

export default router;
