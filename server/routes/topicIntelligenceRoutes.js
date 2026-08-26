import express from "express";
import {
  getDashboardData,
  getOrphanedTopics,
  getCoOccurrenceGraph,
  generateBriefing,
} from "../controllers/topicIntelligenceController.js";
import protect from "../middleware/userAuth.js";
import { requirePermission } from "../middleware/rbac.js";

const router = express.Router();

router.use(protect);
router.use(requirePermission("analytics", "view"));

router.get("/dashboard", getDashboardData);
router.get("/orphaned", getOrphanedTopics);
router.get("/graph", getCoOccurrenceGraph);
router.post("/:clusterId/briefing", generateBriefing);

export default router;
