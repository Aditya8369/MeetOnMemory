import express from "express";
import userAuth from "../middleware/userAuth.js";
import { apiLimiter, writeLimiter } from "../middleware/rateLimiter.js";
import { requireOrgMembership, requirePermission } from "../middleware/rbac.js";
import {
  getOrganizationGraph,
  getMeetingGraph,
  getEntity,
  findPathEndpoint,
  getAnalytics,
  exportGraph,
  search,
} from "../controllers/knowledgeGraphController.js";

const router = express.Router();

/**
 * Knowledge Graph API (Issue #1395).
 *
 * Mounted at `/api/graph`. Guards align with `/api/knowledge` so org isolation
 * is enforced before handlers run — not only via ad-hoc controller checks.
 */
router.use(apiLimiter);
router.use(userAuth);
router.use(requireOrgMembership);
router.use(requirePermission("knowledge", "view"));

// Organization graph
router.get("/organization/:orgId", getOrganizationGraph);
router.get("/analytics/:orgId", getAnalytics);

// Meeting graph
router.get("/meeting/:meetingId", getMeetingGraph);

// Entity operations
router.get("/entity/:type/:id", getEntity);
router.get("/path", findPathEndpoint);
router.get("/search", search);

// Export
router.post("/export", writeLimiter, exportGraph);

export default router;
