import express from "express";
import {
  getOverview,
  getTopics,
  getActionItems,
  getAttendance,
  getSentiment,
  getDecisions,
} from "../controllers/seriesRetrospectiveController.js";

const router = express.Router({ mergeParams: true });

router.get("/overview", getOverview);
router.get("/topics", getTopics);
router.get("/action-items", getActionItems);
router.get("/attendance", getAttendance);
router.get("/sentiment", getSentiment);
router.get("/decisions", getDecisions);

export default router;
