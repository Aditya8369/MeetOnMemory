import express from "express";
import {
  getLeaderboard,
  getUserScore,
  getBadgesGallery,
} from "../controllers/gamificationController.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();

router.use(userAuth);

router.get("/leaderboard", getLeaderboard);
router.get("/score", getUserScore);
router.get("/badges", getBadgesGallery);

export default router;
