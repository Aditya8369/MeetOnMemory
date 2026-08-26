import express from "express";
import {
  getQuizForMeeting,
  submitQuizResponse,
  getQuizAnalytics,
} from "../controllers/meetingQuizController.js";
 feature/careers-admin-queue-2262
import requireAuth from "../middleware/userAuth.js";

import userAuth from "../middleware/userAuth.js";
 main

const router = express.Router({ mergeParams: true });

router.use(userAuth);

router.get("/", getQuizForMeeting);
router.post("/submit", submitQuizResponse);
router.get("/analytics", getQuizAnalytics);

export default router;
