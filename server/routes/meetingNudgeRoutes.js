import express from "express";
import {
  getMyNudges,
  updateNudge,
  getReadiness,
} from "../controllers/meetingNudgeController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getMyNudges);
router.patch("/:id/status", updateNudge);
router.get("/meeting/:meetingId/readiness", getReadiness);

export default router;
