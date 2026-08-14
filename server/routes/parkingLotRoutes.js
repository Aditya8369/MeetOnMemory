import express from "express";
import userAuth from "../middleware/userAuth.js";
import {
  addTopic,
  getOrganizationParkingLot,
  updateTopicStatus,
  assignTopics,
} from "../controllers/parkingLotController.js";

const router = express.Router();

// Require authentication for all routes
router.use(userAuth);

// POST /api/v1/parking-lot - Add a new topic
router.post("/", addTopic);

// POST /api/v1/parking-lot/assign - Assign multiple topics
router.post("/assign", assignTopics);

// GET /api/v1/parking-lot/organization/:orgId - Get parking lot for org
router.get("/organization/:orgId", getOrganizationParkingLot);

// PATCH /api/v1/parking-lot/:id/status - Update topic status
router.patch("/:id/status", updateTopicStatus);

export default router;
