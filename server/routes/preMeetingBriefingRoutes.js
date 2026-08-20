import express from "express";
import userAuth from "../middleware/userAuth.js";
import {
  triggerBriefingGeneration,
  getBriefingByMeetingId,
} from "../controllers/preMeetingBriefingController.js";

const router = express.Router();

router.use(userAuth);

router.post("/:meetingId/generate", triggerBriefingGeneration);
router.get("/:meetingId", getBriefingByMeetingId);

export default router;
