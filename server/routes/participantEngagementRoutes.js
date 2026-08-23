import express from "express";
import userAuth from "../middleware/userAuth.js";
import {
  getParticipantScorecard,
  getOrganizationRankings,
  recalculateScorecard,
  recomputeOrganizationScorecards,
} from "../controllers/participantEngagementController.js";

const router = express.Router();

router.use(userAuth);

// Base route is /api/engagement
router.get("/organization/rankings", getOrganizationRankings);
router.post("/organization/recompute", recomputeOrganizationScorecards);
router.get("/participant/:userId", getParticipantScorecard);
router.post("/participant/:userId/recalculate", recalculateScorecard);

export default router;
