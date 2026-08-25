import express from "express";
import userAuth from "../middleware/userAuth.js";
import tenantIsolation from "../middleware/tenantIsolation.js";
import { requirePermission } from "../middleware/rbac.js";
import {
  getCompletionMetrics,
  getAssigneeLeaderboards,
  getPriorityBreakdowns,
  getOverdueTrends,
  getMeetingEffectiveness,
} from "../controllers/actionItemAnalyticsController.js";

const router = express.Router();

// Apply standard security middleware to all endpoints
router.use(userAuth);
router.use(tenantIsolation);
router.use(requirePermission("reports", "view"));

// Routes
router.get("/completion-metrics", getCompletionMetrics);
router.get("/assignee-leaderboards", getAssigneeLeaderboards);
router.get("/priority-breakdowns", getPriorityBreakdowns);
router.get("/overdue-trends", getOverdueTrends);
router.get("/meeting-effectiveness", getMeetingEffectiveness);

export default router;
