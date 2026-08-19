import express from "express";
import {
  getDecisionGraph,
  getDecisionNeighbors,
} from "../controllers/decisionGraphController.js";
import { apiLimiter } from "../middleware/rateLimiter.js";
import userAuth from "../middleware/userAuth.js";
import { requireOrgMembership, requirePermission } from "../middleware/rbac.js";

const router = express.Router();

router.use(apiLimiter);
router.use(userAuth);
router.use(requireOrgMembership);
router.use(requirePermission("knowledge", "view"));

// Get the full decision graph for the current user's organization
router.get("/", getDecisionGraph);

// Get immediate neighbors for a specific decision
router.get("/:id/neighbors", getDecisionNeighbors);

export default router;
