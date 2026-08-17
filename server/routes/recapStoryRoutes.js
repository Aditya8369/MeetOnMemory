import express from "express";
import userAuth from "../middleware/userAuth.js";
import {
  getMeetingStory,
  getRecentStories,
} from "../controllers/recapStoryController.js";

const router = express.Router();

router.use(userAuth); // Protect all routes

router.get("/stories/recent", getRecentStories);
router.get("/:id/story", getMeetingStory);

export default router;
