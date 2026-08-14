import express from "express";
import {
  getTimeline,
  generateTimeline,
} from "../controllers/sentimentTimelineController.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();

router.use(userAuth);

router.get("/:meetingId", getTimeline);
router.post("/:meetingId/generate", generateTimeline);

export default router;
