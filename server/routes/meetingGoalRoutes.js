import express from "express";
import userAuth from "../middleware/userAuth.js";
import {
  setGoals,
  getGoals,
  updateGoalStatus,
  getOrgGoalStats,
} from "../controllers/meetingGoalController.js";

const router = express.Router();

router.use(userAuth);

router.post("/meeting/:meetingId", setGoals);
router.get("/meeting/:meetingId", getGoals);
router.patch("/meeting/:meetingId/goal/:goalId", updateGoalStatus);
router.get("/org/:orgId/stats", getOrgGoalStats);

export default router;
