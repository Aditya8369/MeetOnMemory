import express from "express";
import { getMeetingTimeline } from "../controllers/meetingTimelineController.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router({ mergeParams: true });

router.get("/:id/timeline", userAuth, getMeetingTimeline);

export default router;
