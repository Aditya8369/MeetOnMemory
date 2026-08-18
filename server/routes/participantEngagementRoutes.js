import express from "express";
import { userAuth } from "../middleware/meetingAuth.js"; // or wherever userAuth is located in this codebase
import {
  getParticipantScorecard,
  getOrganizationRankings,
  recalculateScorecard,
} from "../controllers/participantEngagementController.js";

const router = express.Router();

router.use(userAuth);

// Base route is typically /api/engagement
router.get("/organization/rankings", getOrganizationRankings);
router.get("/participant/:userId", getParticipantScorecard);
router.post("/participant/:userId/recalculate", recalculateScorecard);

export default router;
