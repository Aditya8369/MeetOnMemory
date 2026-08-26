import express from "express";
import {
  getDashboardData,
  getOrphanedTopics,
  getCoOccurrenceGraph,
  generateBriefing,
} from "../controllers/topicIntelligenceController.js";
import { protect } from "../middleware/authMiddleware.js";
import { checkRbac } from "../middleware/rbacMiddleware.js";

const router = express.Router();

router.use(protect);
// Assume "view_analytics" or similar permission is required
router.use(checkRbac("view_analytics"));

router.get("/dashboard", getDashboardData);
router.get("/orphaned", getOrphanedTopics);
router.get("/graph", getCoOccurrenceGraph);
router.post("/:clusterId/briefing", generateBriefing);

export default router;
