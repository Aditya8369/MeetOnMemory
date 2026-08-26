import express from "express";
import userAuth from "../middleware/userAuth.js";
import { requireOrgMembership } from "../middleware/rbac.js";
import {
  getPreferences,
  updatePreferences,
  getHeatmapData,
  findFreeSlots,
  getLoadDistribution,
} from "../controllers/teamAvailabilityController.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(userAuth);
router.use(requireOrgMembership);

// Preference routes
router.get("/preferences", getPreferences);
router.put("/preferences", updatePreferences);

// Heatmap and data routes
router.get("/heatmap", getHeatmapData);
router.post("/free-slots", findFreeSlots); // POST to send array of userIds
router.get("/load-distribution", getLoadDistribution);

export default router;
