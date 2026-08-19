import express from "express";
import userAuth from "../middleware/userAuth.js";
import { requireOrgMembership, requirePermission } from "../middleware/rbac.js";
import {
  addTopic,
  getOrganizationParkingLot,
  updateTopicStatus,
  assignTopics,
} from "../controllers/parkingLotController.js";

const router = express.Router();

// Require authentication and org membership for all routes
router.use(userAuth);
router.use(requireOrgMembership);

// POST /api/v1/parking-lot - Add a new topic
router.post("/", requirePermission("meetings", "edit"), addTopic);

// POST /api/v1/parking-lot/assign - Assign multiple topics
router.post("/assign", requirePermission("meetings", "edit"), assignTopics);

// GET /api/v1/parking-lot/organization/:orgId - Get parking lot for org
router.get(
  "/organization/:orgId",
  requirePermission("meetings", "view"),
  getOrganizationParkingLot,
);

// PATCH /api/v1/parking-lot/:id/status - Update topic status
router.patch(
  "/:id/status",
  requirePermission("meetings", "edit"),
  updateTopicStatus,
);

export default router;
