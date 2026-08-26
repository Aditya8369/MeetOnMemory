import express from "express";
import userAuth from "../middleware/userAuth.js";
import { apiLimiter, writeLimiter } from "../middleware/rateLimiter.js";
import { requireAdminOrOwner, requireRole } from "../middleware/rbac.js";
import {
  getAdminJobs,
  retryAdminJob,
  discardAdminJob,
} from "../controllers/adminJobsController.js";

const router = express.Router();

router.use(userAuth, apiLimiter);

// Admins and owners can view queue status (Issue #2080).
router.get("/", requireAdminOrOwner, getAdminJobs);

// Mutating actions restricted to owners (read-only for non-super-admins).
router.post(
  "/:queueName/:jobId/retry",
  writeLimiter,
  requireRole(["owner"]),
  retryAdminJob,
);
router.delete(
  "/:queueName/:jobId",
  writeLimiter,
  requireRole(["owner"]),
  discardAdminJob,
);

export default router;
