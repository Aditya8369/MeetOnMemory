import express from "express";
import { requireOrgMembership, requirePermission } from "../middleware/rbac.js";
import userAuth from "../middleware/userAuth.js";
import { writeLimiter } from "../middleware/rateLimiter.js";
import {
  bulkArchive,
  bulkTag,
  bulkSoftDelete,
  bulkRestore,
  bulkExport,
} from "../controllers/bulkMeetingController.js";

const router = express.Router();

// All bulk meeting routes require user to be authenticated, belong to an org, and have edit permissions.
router.use(userAuth, requireOrgMembership);

// POST /api/bulk/meetings/archive
router.post(
  "/archive",
  writeLimiter,
  requirePermission("meetings", "edit"),
  bulkArchive,
);

// POST /api/bulk/meetings/tag
router.post(
  "/tag",
  writeLimiter,
  requirePermission("meetings", "edit"),
  bulkTag,
);

// POST /api/bulk/meetings/delete
router.post(
  "/delete",
  writeLimiter,
  requirePermission("meetings", "delete"),
  bulkSoftDelete,
);

// POST /api/bulk/meetings/restore
router.post(
  "/restore",
  writeLimiter,
  requirePermission("meetings", "edit"),
  bulkRestore,
);

// POST /api/bulk/meetings/export
router.post(
  "/export",
  writeLimiter,
  requirePermission("meetings", "export"),
  bulkExport,
);

export default router;
