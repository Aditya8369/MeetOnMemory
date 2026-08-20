import express from "express";
import {
  getLeaderboard,
  getUserScore,
} from "../controllers/gamificationController.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();

router.use(userAuth);

router.get("/leaderboard", getLeaderboard);
router.get("/score", getUserScore);

export default router;
