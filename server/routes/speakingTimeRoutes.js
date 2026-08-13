import express from "express";
import {
  getSpeakingTimeBreakdown,
  getSpeakingTimeTrends,
} from "../controllers/speakingTimeController.js";
import { userAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get overall trends for the logged-in user
router.get("/trends", userAuth, getSpeakingTimeTrends);

// Get speaking time breakdown for a specific meeting
router.get("/:meetingId/breakdown", userAuth, getSpeakingTimeBreakdown);

export default router;
